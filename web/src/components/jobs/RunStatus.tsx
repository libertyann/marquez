// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box, Tooltip, createTheme } from '@mui/material'
import { Run } from '../../types/api'
import { runStateColor } from '../../helpers/nodes'

import { useTheme } from '@emotion/react'
import React, { FunctionComponent } from 'react'

interface RunStatusProps {
  run: Run
}

const RunStatus: FunctionComponent<RunStatusProps> = (props) => {
  const { run } = props
  const theme = createTheme(useTheme())

  return (
    <Tooltip title={run.state}>
      <Box
        mr={1}
        sx={{
          minWidth: theme.spacing(2),
          width: theme.spacing(2),
          height: theme.spacing(2),
          borderRadius: '50%',
        }}
        style={{ backgroundColor: runStateColor(run.state) }}
      />
    </Tooltip>
  )
}

export default RunStatus
