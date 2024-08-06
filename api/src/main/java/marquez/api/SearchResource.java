/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.api;

import static javax.ws.rs.core.MediaType.APPLICATION_JSON;
import static marquez.common.Utils.toLocateDateOrNull;

import com.codahale.metrics.annotation.ExceptionMetered;
import com.codahale.metrics.annotation.ResponseMetered;
import com.codahale.metrics.annotation.Timed;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.annotation.Nullable;
import javax.validation.Valid;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import lombok.Getter;
import lombok.NonNull;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;
import marquez.api.models.SearchFilter;
import marquez.api.models.SearchResult;
import marquez.api.models.SearchSort;
import marquez.db.SearchDao;
import marquez.service.SearchService;
import marquez.service.ServiceFactory;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.opensearch.client.opensearch.core.search.Hit;

@Slf4j
@Path("/api/v2beta/search")
public class SearchResource {
  private static final String YYYY_MM_DD = "^\\d{4}-\\d{2}-\\d{2}$";
  private static final String DEFAULT_SORT = "name";
  private static final String DEFAULT_LIMIT = "10";
  private static final int MIN_LIMIT = 0;

  private final SearchService searchService;
  private final SearchDao searchDao;

  public SearchResource(
      @NonNull final ServiceFactory serviceFactory, @NonNull final SearchDao searchDao) {
    this.searchService = serviceFactory.getSearchService();
    this.searchDao = searchDao;
  }

  @Timed
  @ResponseMetered
  @ExceptionMetered
  @GET
  @Produces(APPLICATION_JSON)
  public Response search(
      @QueryParam("q") @NotBlank String query,
      @QueryParam("filter") @Nullable SearchFilter filter,
      @QueryParam("sort") @DefaultValue(DEFAULT_SORT) SearchSort sort,
      @QueryParam("limit") @DefaultValue(DEFAULT_LIMIT) @Min(MIN_LIMIT) int limit,
      @QueryParam("namespace") @Nullable String namespace,
      @QueryParam("before") @Valid @Pattern(regexp = YYYY_MM_DD) @Nullable String before,
      @QueryParam("after") @Valid @Pattern(regexp = YYYY_MM_DD) @Nullable String after) {
    final List<SearchResult> searchResults =
        searchDao.search(
            query,
            filter,
            sort,
            limit,
            namespace,
            toLocateDateOrNull(before),
            toLocateDateOrNull(after));
    return Response.ok(new SearchResults(searchResults)).build();
  }

  @Timed
  @ResponseMetered
  @ExceptionMetered
  @GET
  @Produces(APPLICATION_JSON)
  @Path("/jobs")
  public Response searchJobs(@QueryParam("q") @NotBlank String query) throws IOException {
    return formatEsResponse(this.searchService.searchJobs(query));
  }

  @Timed
  @ResponseMetered
  @ExceptionMetered
  @GET
  @Produces(APPLICATION_JSON)
  @Path("/datasets")
  public Response searchDatasets(@QueryParam("q") @NotBlank String query) throws IOException {
    return formatEsResponse(this.searchService.searchDatasets(query));
  }

  private Response formatEsResponse(SearchResponse<ObjectNode> response) {
    List<ObjectNode> hits =
        response.hits().hits().stream().map(Hit::source).collect(Collectors.toList());
    List<Map<String, List<String>>> highlights =
        response.hits().hits().stream().map(Hit::highlight).collect(Collectors.toList());

    return Response.ok(new OpenSearchResult(hits, highlights)).build();
  }

  @ToString
  public static final class OpenSearchResult {
    @Getter private final List<ObjectNode> hits;
    @Getter private final List<Map<String, List<String>>> highlights;

    @JsonCreator
    public OpenSearchResult(
        @NonNull List<ObjectNode> hits, @NonNull List<Map<String, List<String>>> highlights) {
      this.hits = hits;
      this.highlights = highlights;
    }
  }

  /** Wrapper for {@link SearchResult}s which also contains a {@code total count}. */
  @ToString
  public static final class SearchResults {
    @Getter private final int totalCount;
    @Getter private final List<SearchResult> results;

    @JsonCreator
    public SearchResults(@NonNull final List<SearchResult> results) {
      this.totalCount = results.size();
      this.results = results;
    }
  }
}
