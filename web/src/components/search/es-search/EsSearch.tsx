// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as Redux from 'redux'
import { Chip, Divider } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IEsSearchDatasetsState } from '../../../store/reducers/esSearchDatasets'
import { IEsSearchJobsState } from '../../../store/reducers/esSearch'
import { IState } from '../../../store/reducers'
import { Nullable } from '../../../types/util/Nullable'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { debounce } from 'lodash'
import { eventTypeColor } from '../../../helpers/nodes'
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog'
import { faDatabase } from '@fortawesome/free-solid-svg-icons'
import { fetchEsSearchDatasets, fetchEsSearchJobs } from '../../../store/actionCreators'
import { theme } from '../../../helpers/theme'
import { truncateText } from '../../../helpers/text'
import Box from '@mui/system/Box'
import MQTooltip from '../../core/tooltip/MQTooltip'
import MqEmpty from '../../core/empty/MqEmpty'
import MqStatus from '../../core/status/MqStatus'
import MqText from '../../core/text/MqText'
import React, { useCallback, useEffect } from 'react'
import airflow_logo from './airlfow-logo.svg'
import spark_logo from './spark-logo.svg'

interface StateProps {
  esSearchJobs: IEsSearchJobsState
  esSearchDatasets: IEsSearchDatasetsState
}

interface DispatchProps {
  fetchEsSearchJobs: typeof fetchEsSearchJobs
  fetchEsSearchDatasets: typeof fetchEsSearchDatasets
}

interface Props {
  search: string
}

type TextSegment = {
  text: string
  isHighlighted: boolean
}

function parseStringToSegments(input: string): TextSegment[] {
  return input.split(/(<em>.*?<\/em>)/).map((segment) => {
    if (segment.startsWith('<em>') && segment.endsWith('</em>')) {
      return {
        text: segment.slice(4, -5),
        isHighlighted: true,
      }
    } else {
      return {
        text: segment,
        isHighlighted: false,
      }
    }
  })
}

// function getValueAfterLastPeriod(s: string) {
//   return s.split('.').pop()
// }

const useArrowKeys = (callback: (direction: 'up' | 'down') => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault() // Prevent the default browser action
        callback('down')
      } else if (event.key === 'ArrowUp') {
        event.preventDefault() // Prevent the default browser action
        callback('up')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [callback])
}

const FIELDS_TO_PRINT = 5
const DEBOUNCE_TIME_MS = 500

const EsSearch: React.FC<StateProps & DispatchProps & Props> = ({
  search,
  fetchEsSearchJobs,
  fetchEsSearchDatasets,
  esSearchJobs,
  esSearchDatasets,
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState<Nullable<number>>(null)

  useArrowKeys((direction) => {
    if (direction === 'up') {
      setSelectedIndex(selectedIndex === null ? null : Math.max(selectedIndex - 1, 0))
    } else {
      setSelectedIndex(
        selectedIndex === null
          ? 0
          : Math.min(
              selectedIndex + 1,
              esSearchJobs.data.hits.length + esSearchDatasets.data.hits.length - 1
            )
      )
    }
  })

  const debouncedFetchJobs = useCallback(
    debounce((searchTerm) => fetchEsSearchJobs(searchTerm), DEBOUNCE_TIME_MS),
    []
  )

  const debouncedFetchDatasets = useCallback(
    debounce((searchTerm) => fetchEsSearchDatasets(searchTerm), DEBOUNCE_TIME_MS),
    []
  )

  useEffect(() => {
    debouncedFetchJobs(search)
    debouncedFetchDatasets(search)
  }, [search, debouncedFetchJobs, debouncedFetchDatasets])

  useEffect(() => {
    setSelectedIndex(null)
  }, [esSearchJobs.data.hits, esSearchDatasets.data.hits])

  if (esSearchJobs.data.hits.length === 0 && esSearchDatasets.data.hits.length === 0) {
    return (
      <Box my={4}>
        <MqEmpty title={'No Hits'} body={'Keep typing or try a more precise search.'} />
      </Box>
    )
  }

  return (
    <Box>
      {esSearchJobs.data.hits.map((hit, index) => {
        return (
          <Box
            key={hit.run_id}
            px={2}
            py={1}
            borderBottom={1}
            borderColor={'divider'}
            sx={{
              transition: 'background-color 0.3s',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              backgroundColor: selectedIndex === index ? theme.palette.action.hover : undefined,
            }}
          >
            <Box display={'flex'}>
              <Box display={'flex'}>
                <Box display={'flex'} alignItems={'center'} height={42}>
                  <FontAwesomeIcon icon={faCog} color={theme.palette.primary.main} />
                </Box>
                <Box ml={2} width={280} minWidth={280}>
                  <MQTooltip title={hit.name}>
                    <Box>
                      <MqText font={'mono'}>{truncateText(hit.name, 30)}</MqText>
                    </Box>
                  </MQTooltip>
                  <MQTooltip title={hit.namespace}>
                    <Box>
                      <MqText subdued label>
                        {truncateText(hit.namespace, 30)}
                      </MqText>
                    </Box>
                  </MQTooltip>
                </Box>
              </Box>
              <Divider flexItem sx={{ mx: 1 }} orientation={'vertical'} />
              <Box>
                <MqText subdued label>
                  Last State
                </MqText>
                <MqStatus color={eventTypeColor(hit.eventType)} label={hit.eventType} />
              </Box>
              {hit.runFacets?.processing_engine && (
                <>
                  <Divider flexItem sx={{ mx: 1 }} orientation={'vertical'} />
                  <Box>
                    <MqText subdued label>
                      {'Integration'}
                    </MqText>
                    {hit.runFacets.processing_engine.name === 'spark' ? (
                      <img src={spark_logo} height={24} alt='Spark' />
                    ) : hit.runFacets.processing_engine.name === 'Airflow' ? (
                      <img src={airflow_logo} height={24} alt='Airflow' />
                    ) : (
                      <Chip size={'small'} label={hit.runFacets?.processing_engine.name} />
                    )}
                  </Box>
                </>
              )}

              <Divider flexItem sx={{ mx: 1 }} orientation={'vertical'} />
              <Box>
                <MqText subdued label>
                  Match
                </MqText>
                <Box>
                  {Object.entries(esSearchJobs.data.highlights[index]).map(([key, value]) => {
                    return value.map((highlightedString: any, idx: number) => {
                      return (
                        <Box
                          key={`${key}-${value}-${idx}`}
                          display={'flex'}
                          alignItems={'center'}
                          mb={0.5}
                        >
                          {/*<Chip label={key} variant={'outlined'} size={'small'} sx={{ mr: 1 }} />*/}
                          <MqText inline bold sx={{ mr: 1 }}>
                            {`${key}: `}
                          </MqText>
                          <Box>
                            {parseStringToSegments(highlightedString || '').map(
                              (segment, index) => (
                                <MqText
                                  subdued
                                  small
                                  key={`${key}-${highlightedString}-${segment.text}-${index}`}
                                  inline
                                  highlight={segment.isHighlighted}
                                >
                                  {segment.text}
                                </MqText>
                              )
                            )}
                          </Box>
                        </Box>
                      )
                    })
                  })}
                </Box>
              </Box>
              {hit.facets?.sourceCode?.language && (
                <>
                  <Divider flexItem sx={{ mx: 1 }} orientation={'vertical'} />
                  <Box>
                    <MqText subdued label>
                      {'Language'}
                    </MqText>
                    <Chip
                      size={'small'}
                      variant={'outlined'}
                      label={hit.facets?.sourceCode.language}
                    />
                  </Box>
                </>
              )}
            </Box>
          </Box>
        )
      })}
      {esSearchDatasets.data.hits.map((hit, index) => {
        return (
          <Box
            key={hit.run_id}
            px={2}
            py={1}
            borderBottom={1}
            borderColor={'divider'}
            sx={{
              transition: 'background-color 0.3s',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              backgroundColor:
                selectedIndex === index + esSearchDatasets.data.hits.length
                  ? theme.palette.action.hover
                  : undefined,
            }}
          >
            <Box display={'flex'}>
              <Box display={'flex'}>
                <Box display={'flex'} alignItems={'center'} height={42}>
                  <FontAwesomeIcon icon={faDatabase} color={theme.palette.info.main} />
                </Box>
                <Box ml={2} width={280} minWidth={280}>
                  <MQTooltip title={hit.name}>
                    <Box>
                      <MqText font={'mono'}>{truncateText(hit.name, 30)}</MqText>
                    </Box>
                  </MQTooltip>
                  <MQTooltip title={hit.namespace}>
                    <Box>
                      <MqText subdued label>
                        {truncateText(hit.namespace, 30)}
                      </MqText>
                    </Box>
                  </MQTooltip>
                </Box>
              </Box>
              <Divider orientation={'vertical'} sx={{ mx: 1 }} flexItem />
              <Box>
                <MqText subdued label>
                  Match
                </MqText>
                <Box>
                  {Object.entries(esSearchDatasets.data.highlights[index]).map(([key, value]) => {
                    return value.map((highlightedString: any, idx: number) => {
                      return (
                        <Box
                          key={`${key}-${value}-${idx}`}
                          display={'flex'}
                          alignItems={'center'}
                          mb={0.5}
                          mr={0.5}
                        >
                          <Chip label={key} variant={'outlined'} size={'small'} sx={{ mr: 1 }} />
                          {parseStringToSegments(highlightedString || '').map((segment, index) => (
                            <MqText
                              subdued
                              small
                              key={`${key}-${highlightedString}-${segment.text}-${index}`}
                              inline
                              highlight={segment.isHighlighted}
                            >
                              {segment.text}
                            </MqText>
                          ))}
                        </Box>
                      )
                    })
                  })}
                </Box>
              </Box>
              <Divider orientation={'vertical'} flexItem sx={{ mx: 1 }} />
              <Box display={'flex'} flexDirection={'column'} justifyContent={'flex-start'}>
                <MqText subdued label>
                  Fields
                </MqText>
                <Box>
                  {hit.facets.schema.fields.slice(0, FIELDS_TO_PRINT).map((field) => {
                    return (
                      <Chip
                        key={field.name}
                        label={field.name}
                        variant={'outlined'}
                        size={'small'}
                        sx={{ mr: 1 }}
                      />
                    )
                  })}
                  {hit.facets.schema.fields.length > FIELDS_TO_PRINT && (
                    <MqText inline subdued>{`+ ${
                      hit.facets.schema.fields.length - FIELDS_TO_PRINT
                    }`}</MqText>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

const mapStateToProps = (state: IState) => {
  return {
    esSearchJobs: state.esSearchJobs,
    esSearchDatasets: state.esSearchDatasets,
  }
}

const mapDispatchToProps = (dispatch: Redux.Dispatch) =>
  bindActionCreators(
    {
      fetchEsSearchJobs: fetchEsSearchJobs,
      fetchEsSearchDatasets: fetchEsSearchDatasets,
    },
    dispatch
  )

export default connect(mapStateToProps, mapDispatchToProps)(EsSearch)