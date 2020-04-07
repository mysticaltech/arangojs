import { ArangoResponseMetadata } from "./connection";
import { Database } from "./database";
import { isArangoError } from "./error";
import { VIEW_NOT_FOUND } from "./util/codes";
import { Dict } from "./util/types";

/**
 * TODO
 */
export enum ViewType {
  ARANGOSEARCH_VIEW = "arangosearch",
}

/**
 * TODO
 */
export function isArangoView(view: any): view is View {
  return Boolean(view && view.isArangoView);
}

/**
 * TODO
 */
export type ViewDescription = {
  globallyUniqueId: string;
  id: string;
  name: string;
  type: ViewType;
};

/**
 * TODO
 */
export type ViewResponse = {
  name: string;
  id: string;
  globallyUniqueId: string;
  type: ViewType;
};

/**
 * TODO
 */
export type ArangoSearchViewLink = {
  /**
   * Default: `["identity"]`
   *
   * A list of names of Analyzers to apply to values of processed document
   * attributes.
   */
  analyzers?: string[];
  /**
   * An object mapping names of attributes to process for each document to
   * {@link ArangoSearchViewLink} definitions.
   */
  fields?: Dict<ArangoSearchViewLink | undefined>;
  /**
   * Default: `false`
   *
   * If set to `true`, all document attributes will be processed, otherwise
   * only the attributes in `fields` will be processed.
   */
  includeAllFields?: boolean;
  /**
   * If set to `true`, the position of values in array values will be tracked,
   * otherwise all values in an array will be treated as equal alternatives.
   */
  trackListPositions?: boolean;
  /**
   * Default: `"none"`
   *
   * Controls how the view should keep track of the attribute values.
   */
  storeValues?: "none" | "id";
};

/**
 * TODO
 */
export type ArangoSearchViewProperties = {
  cleanupIntervalStep: number;
  consolidationIntervalMsec: number;
  writebufferIdle: number;
  writebufferActive: number;
  writebufferSizeMax: number;
  consolidationPolicy: {
    type: "bytes_accum" | "tier";
    threshold?: number;
    segments_min?: number;
    segments_max?: number;
    segments_bytes_max?: number;
    segments_bytes_floor?: number;
    lookahead?: number;
  };
  links: Dict<ArangoSearchViewLink | undefined>;
};

/**
 * TODO
 */
export type ArangoSearchViewPropertiesResponse = ViewResponse &
  ArangoSearchViewProperties & {
    type: ViewType.ARANGOSEARCH_VIEW;
  };

/**
 * Policy to consolidate based on segment byte size and live document count as
 * dictated by the customization attributes.
 */
export type BytesAccumConsolidationPolicy = {
  /**
   * The type of consolidation policy.
   */
  type: "bytes_accum";
  /**
   * Must be in the range of `0.0` to `1.0`.
   */
  threshold?: number;
};

/**
 * Policy to consolidate if the sum of all candidate segment byte size is less
 * than the total segment byte size multiplied by a given threshold.
 */
export type TierConsolidationPolicy = {
  /**
   * The type of consolidation policy.
   */
  type: "tier";
  /**
   * Default: `1`
   *
   * The minimum number of segments that will be evaluated as candidates
   * for consolidation.
   */
  segmentsMin?: number;
  /**
   * Default: `10`
   *
   * The maximum number of segments that will be evaluated as candidates
   * for consolidation.
   */
  segmentsMax?: number;
  /**
   * Default: `5368709120`, i.e. 5 GiB
   *
   * Maximum allowed size of all consolidated segments.
   */
  segmentsBytesMax?: number;
  /**
   * Default: `2097152`, i.e. 2 MiB
   *
   * Defines the value to treat all smaller segments as equal for
   * consolidation selection.
   */
  segmentsBytesFloor?: number;
  /**
   * Minimum score.
   */
  minScore?: number;
};

/**
 * TODO
 */
export type ArangoSearchViewPropertiesOptions = {
  /**
   * Default: `2`
   *
   * How many commits to wait between removing unused files.
   */
  cleanupIntervalStep?: number;
  /**
   * Default: `10000`
   *
   * How long to wait between applying the `consolidationPolicy`.
   */
  consolidationIntervalMsec?: number;
  /**
   * Default: `1000`
   *
   * How long to wait between commiting View data store changes and making
   * documents visible to queries.
   */
  commitIntervalMsec?: number;
  /**
   * Default: `64`
   *
   * Maximum number of writers cached in the pool.
   */
  writebufferIdle?: number;
  /**
   * Default: `0`
   *
   * Maximum number of concurrent active writers that perform a transaction.
   */
  writebufferActive?: number;
  /**
   * Default: `33554432`, i.e. 32 MiB
   *
   * Maximum memory byte size per writer before a writer flush is triggered.
   */
  writebufferSizeMax?: number;
  /**
   * The consolidation policy to apply for selecting which segments should be
   * merged.
   */
  consolidationPolicy?: BytesAccumConsolidationPolicy | TierConsolidationPolicy;
  /**
   * The attribute path (`field`) for the value of each document that will be
   * used for sorting.
   *
   * If `direction` is set to `"asc"` or `asc` is set to `true`,
   * the primary sorting order will be ascending.
   *
   * If `direction` is set to `"desc"` or `asc` is set to `false`,
   * the primary sorting order will be descending.
   */
  primarySort?: (
    | {
        /**
         * The attribute path for the value of each document to use for
         * sorting.
         */
        field: string;
        /**
         * If set to `"asc"`, the primary sorting order will be ascending.
         * If set to `"desc"`, the primary sorting order will be descending.
         */
        direction: "desc" | "asc";
      }
    | {
        /**
         * The attribute path for the value of each document to use for
         * sorting.
         */
        field: string;
        /**
         * If set to `true`, the primary sorting order will be ascending.
         * If set to `false`, the primary sorting order will be descending.
         */
        asc: boolean;
      }
  )[];
  /**
   * An object mapping names of linked collections to
   * {@link ArangoSearchViewLink} definitions.
   */
  links?: Dict<ArangoSearchViewLink | undefined>;
};

/**
 * TODO
 */
export class View<
  PropertiesOptions extends object = any,
  PropertiesResponse extends object = any
> {
  protected _name: string;
  protected _db: Database;

  /** @hidden */
  constructor(db: Database, name: string) {
    this._db = db;
    this._name = name;
  }

  /**
   * TODO
   */
  get isArangoView(): true {
    return true;
  }

  /**
   * TODO
   */
  get name() {
    return this._name;
  }

  /**
   * TODO
   */
  get(): Promise<ViewResponse & ArangoResponseMetadata> {
    return this._db.request(
      { path: `/_api/view/${this.name}` },
      (res) => res.body
    );
  }

  /**
   * TODO
   */
  async exists(): Promise<boolean> {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === VIEW_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  /**
   * TODO
   */
  create(options?: PropertiesOptions): Promise<PropertiesResponse> {
    return this._db.request(
      {
        method: "POST",
        path: "/_api/view",
        body: {
          type: ViewType.ARANGOSEARCH_VIEW,
          ...(options || {}),
          name: this.name,
        },
      },
      (res) => res.body
    );
  }

  /**
   * TODO
   */
  async rename(
    newName: string
  ): Promise<ViewResponse & ArangoResponseMetadata> {
    const result = this._db.renameView(this._name, newName);
    this._name = newName;
    return result;
  }

  /**
   * TODO
   */
  properties(): Promise<PropertiesResponse & ArangoResponseMetadata> {
    return this._db.request(
      { path: `/_api/view/${this.name}/properties` },
      (res) => res.body
    );
  }

  /**
   * TODO
   */
  setProperties(properties?: PropertiesOptions): Promise<PropertiesResponse> {
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/view/${this.name}/properties`,
        body: properties || {},
      },
      (res) => res.body
    );
  }

  /**
   * TODO
   */
  replaceProperties(
    properties?: PropertiesOptions
  ): Promise<PropertiesResponse> {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/view/${this.name}/properties`,
        body: properties || {},
      },
      (res) => res.body
    );
  }

  /**
   * TODO
   */
  drop(): Promise<boolean> {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/view/${this.name}`,
      },
      (res) => res.body.result
    );
  }
}

/**
 * TODO
 */
export interface ArangoSearchView
  extends View<
    ArangoSearchViewPropertiesOptions,
    ArangoSearchViewPropertiesResponse
  > {}
