import { ArangoResponseMetadata, Params } from "./connection";
import { ArrayCursor } from "./cursor";
import { Database } from "./database";
import {
  Document,
  DocumentData,
  DocumentMetadata,
  DocumentSelector,
  Edge,
  EdgeData,
  _documentHandle,
} from "./documents";
import { isArangoError } from "./error";
import {
  EnsureIndexFulltextOptions,
  EnsureIndexGeoOptions,
  EnsureIndexHashOptions,
  EnsureIndexPersistentOptions,
  EnsureIndexSkiplistOptions,
  EnsureIndexTtlOptions,
  FulltextIndex,
  GeoIndex,
  HashIndex,
  Index,
  IndexSelector,
  PersistentIndex,
  SkiplistIndex,
  TtlIndex,
  _indexHandle,
} from "./indexes";
import { Blob } from "./lib/blob";
import { COLLECTION_NOT_FOUND, DOCUMENT_NOT_FOUND } from "./util/codes";
import { Patch } from "./util/types";

/**
 * Indicates whether the given value represents an {@link ArangoCollection}.
 *
 * @param collection - A value that might be a collection.
 */
export function isArangoCollection(
  collection: any
): collection is ArangoCollection {
  return Boolean(collection && collection.isArangoCollection);
}

/**
 * A marker interface identifying objects that can be used in AQL template
 * strings to create references to ArangoDB collections.
 *
 * See {@link aql}.
 */
export interface ArangoCollection {
  isArangoCollection: true;
  name: string;
}

export enum CollectionType {
  DOCUMENT_COLLECTION = 2,
  EDGE_COLLECTION = 3,
}

export enum CollectionStatus {
  NEWBORN = 1,
  UNLOADED = 2,
  LOADED = 3,
  UNLOADING = 4,
  DELETED = 5,
  LOADING = 6,
}

export type KeyGenerator = "traditional" | "autoincrement" | "uuid" | "padded";

export type ShardingStrategy =
  | "hash"
  | "enterprise-hash-smart-edge"
  | "community-compat"
  | "enterprise-compat"
  | "enterprise-smart-edge-compat";

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryAllKeys = "id" | "key" | "path";

export type ValidationLevel = "none" | "new" | "moderate" | "strict";

export type CollectionMetadata = {
  name: string;
  globallyUniqueId: string;
  status: CollectionStatus;
  type: CollectionType;
  isSystem: boolean;
};

export type CollectionProperties = CollectionMetadata & {
  statusString: string;
  waitForSync: boolean;
  keyOptions: {
    type: KeyGenerator;
    allowUserKeys: boolean;
    increment?: number;
    offset?: number;
    lastValue: number;
  };
  validation: {
    rule: any;
    type: "json";
    level: ValidationLevel;
    message: string;
  } | null;

  // Cluster options
  writeConcern: number;
  /**
   * @deprecated Renamed to `writeConcern` in ArangoDB 3.6.
   */
  minReplicationFactor: number;
  numberOfShards?: number;
  shardKeys?: string[];
  replicationFactor?: number;
  shardingStrategy?: ShardingStrategy;

  // Extra options
  /** MMFiles only */
  doCompact?: boolean;
  /** MMFiles only */
  journalSize?: number;
  /** MMFiles only */
  indexBuckets?: number;
  /** MMFiles only */
  isVolatile?: boolean;
  /** Enterprise Edition only */
  distributeShardsLike?: string;
  /** Enterprise Edition only */
  smartJoinAttribute?: string;
};

// Options

export type CollectionPropertiesOptions = {
  waitForSync?: boolean;
  validation?: {
    rule: any;
    level?: ValidationLevel;
    message?: string;
  };
  /** MMFiles only */
  journalSize?: number;
};

export type CollectionChecksumOptions = {
  withRevisions?: boolean;
  withData?: boolean;
};

export type CollectionDropOptions = {
  isSystem?: boolean;
};

export type CollectionKeyOptions = {
  /**
   * Type of key generator to use.
   */
  type?: KeyGenerator;
  /**
   * Unless set to `false`, documents can be created with a user-specified
   * `_key` attribute.
   *
   * Default: `true`
   */
  allowUserKeys?: boolean;
  /**
   * (Autoincrement only.) How many steps to increment the key each time.
   */
  increment?: number;
  /**
   * (Autoincrement only.) The initial offset for the key.
   */
  offset?: number;
};

export type ValidationOptions = {
  /**
   * TODO
   */
  rule: any;
  /**
   * TODO
   */
  level?: ValidationLevel;
  /**
   * TODO
   */
  message?: string;
};

export type CreateCollectionOptions = {
  /**
   * If set to `true`, data will be synchronized to disk before returning from
   * a document create, update, replace or removal operation.
   *
   * Default: `false`
   */
  waitForSync?: boolean;
  /**
   * Whether the collection should be created as a system collection.
   *
   * Default: `false`
   *
   * @internal
   */
  isSystem?: boolean;
  /**
   * TODO
   */
  keyOptions?: CollectionKeyOptions;
  /**
   * TODO
   */
  validation?: ValidationOptions;
  /**
   * (Cluster only.) Unless set to `false`, the server will wait for all
   * replicas to create the collection before returning.
   *
   * Default: `true`
   */
  waitForSyncReplication?: boolean;
  /**
   * (Cluster only.) Unless set to `false`, the server will check whether
   * enough replicas are available at creation time and bail out otherwise.
   *
   * Default: `true`
   */
  enforceReplicationFactor?: boolean;
  /**
   * (Cluster only.) Number of shards to distribute the collection across.
   *
   * Default: `1`
   */
  numberOfShards?: number;
  /**
   * (Cluster only.) Document attributes to use to determine the target shard
   * for each document.
   *
   * Default: `["_key"]`
   */
  shardKeys?: string[];
  /**
   * (Cluster only.) How many copies of each document should be kept in the
   * cluster.
   *
   * Default: `1`
   */
  replicationFactor?: number;
  /**
   * (Cluster only.) Write concern for this collection.
   */
  writeConcern?: number;
  /**
   * (Cluster only.) Write concern for this collection.
   *
   * @deprecated Renamed to `writeConcern` in ArangoDB 3.6.
   */
  minReplicationFactor?: number;
  /**
   * (Cluster only.) Sharding strategy to use.
   */
  shardingStrategy?: ShardingStrategy;
  /**
   * (MMFiles only.) Number of buckets into which indexes using hash tables are
   * split.
   *
   * Must be a power of 2 and less than or equal to `1024`.
   *
   * Default: `16`
   */
  indexBuckets?: number;
  /**
   * (MMFiles only.) Whether the collection will be compacted.
   *
   * Default: `true`
   */
  doCompact?: boolean;
  /**
   * (MMFiles only.) The maximum size for each journal or datafile in bytes.
   *
   * Must be a number greater than or equal to `1048576` (1 MiB).
   */
  journalSize?: number;
  /**
   * (MMFiles only.) If set to `true`, the collection will only be kept
   * in-memory and discarded when unloaded, resulting in full data loss.
   *
   * Default: `false`
   */
  isVolatile?: boolean;
  /**
   * (Enterprise Edition cluster only.) If set to a collection name, sharding
   * of the new collection will follow the rules for that collection. As long
   * as the new collection exists, the indicated collection can not be dropped.
   */
  distributeShardsLike?: string;
  /**
   * (Enterprise Edition cluster only.) Attribute containing the shard key
   * value of the referred-to smart join collection.
   */
  smartJoinAttribute?: string;
};

export type CollectionReadOptions = {
  graceful?: boolean;
  allowDirtyRead?: boolean;
};

type CollectionSaveOptions = {
  waitForSync?: boolean;
  silent?: boolean;
  returnNew?: boolean;
  returnOld?: boolean;
};

export type CollectionInsertOptions = CollectionSaveOptions & {
  overwrite?: boolean;
  overwriteMode?: "update" | "replace";
};

export type CollectionReplaceOptions = CollectionSaveOptions & {
  ignoreRevs?: boolean;
};

export type CollectionUpdateOptions = CollectionReplaceOptions & {
  keepNull?: boolean;
  mergeObjects?: boolean;
};

export type CollectionRemoveOptions = {
  rSync?: boolean;
  returnOld?: boolean;
  silent?: boolean;
};

export type CollectionImportOptions = {
  type?: null | "auto" | "documents" | "array";
  fromPrefix?: string;
  toPrefix?: string;
  overwrite?: boolean;
  waitForSync?: boolean;
  onDuplicate?: "error" | "update" | "replace" | "ignore";
  complete?: boolean;
  details?: boolean;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryByExampleOptions = {
  skip?: number;
  limit?: number;
  batchSize?: number;
  ttl?: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryAllOptions = SimpleQueryByExampleOptions & {
  stream?: boolean;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryUpdateByExampleOptions = {
  keepNull?: boolean;
  waitForSync?: boolean;
  limit?: number;
  mergeObjects?: boolean;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryRemoveByExampleOptions = {
  waitForSync?: boolean;
  limit?: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryReplaceByExampleOptions = SimpleQueryRemoveByExampleOptions;

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryRemoveByKeysOptions = {
  returnOld?: boolean;
  silent?: boolean;
  waitForSync?: boolean;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryFulltextOptions = {
  index?: string;
  limit?: number;
  skip?: number;
};

/** @deprecated ArangoDB 3.4 */
export type TraversalOptions = {
  init?: string;
  filter?: string;
  sort?: string;
  visitor?: string;
  expander?: string;
  direction?: "inbound" | "outbound" | "any";
  itemOrder?: "forward" | "backward";
  strategy?: "depthfirst" | "breadthfirst";
  order?: "preorder" | "postorder" | "preorder-expander";
  uniqueness?: {
    vertices?: "none" | "global" | "path";
    edges?: "none" | "global" | "path";
  };
  minDepth?: number;
  maxDepth?: number;
  maxIterations?: number;
};

// Results

export type CollectionPropertiesAndCount = CollectionProperties & {
  count: number;
};

export type CollectionPropertiesAndFigures = CollectionProperties & {
  count: number;
  figures: {
    alive: {
      count: number;
      size: number;
    };
    dead: {
      count: number;
      size: number;
      deletion: number;
    };
    datafiles: {
      count: number;
      fileSize: number;
    };
    journals: {
      count: number;
      fileSize: number;
    };
    compactors: {
      count: number;
      fileSize: number;
    };
    shapefiles: {
      count: number;
      fileSize: number;
    };
    shapes: {
      count: number;
      size: number;
    };
    attributes: {
      count: number;
      size: number;
    };
    indexes: {
      count: number;
      size: number;
    };
    lastTick: number;
    uncollectedLogfileEntries: number;
    documentReferences: number;
    waitingFor: string;
    compactionStatus: {
      time: string;
      message: string;
      count: number;
      filesCombined: number;
      bytesRead: number;
      bytesWritten: number;
    };
  };
};

export type CollectionPropertiesAndRevision = CollectionProperties & {
  revision: string;
};

export type CollectionChecksum = {
  revision: string;
  checksum: string;
};

export type CollectionLoadResult = CollectionMetadata & {
  count?: number;
};

export type CollectionImportResult = {
  error: false;
  created: number;
  errors: number;
  empty: number;
  updated: number;
  ignored: number;
  details?: string[];
};

export type CollectionEdgesResult<T extends object = any> = {
  edges: Edge<T>[];
  stats: {
    scannedIndex: number;
    filtered: number;
  };
};

export type CollectionInsertResult<T> = DocumentMetadata & {
  new?: T;
};

export type CollectionRemoveResult<T> = DocumentMetadata & {
  old?: T;
};

export type CollectionSaveResult<T> = CollectionInsertResult<T> &
  CollectionRemoveResult<T>;

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryRemoveByExampleResult = {
  deleted: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryReplaceByExampleResult = {
  replaced: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryUpdateByExampleResult = {
  updated: number;
};

/** @deprecated ArangoDB 3.4 */
export type SimpleQueryRemoveByKeysResult<T extends object = any> = {
  removed: number;
  ignored: number;
  old?: DocumentMetadata[] | Document<T>[];
};

export type CollectionIndexResult = {
  id: string;
};

// Collections

/**
 * Represents an document collection in a {@link Database}.
 *
 * See {@link EdgeCollection} for a variant of this interface more suited for
 * edge collections.
 */
export interface DocumentCollection<T extends object = any>
  extends ArangoCollection {
  exists(): Promise<boolean>;
  get(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  create(
    options?: CreateCollectionOptions & {
      type?: CollectionType;
    }
  ): Promise<ArangoResponseMetadata & CollectionProperties>;
  properties(): Promise<ArangoResponseMetadata & CollectionProperties>;
  properties(
    properties: CollectionPropertiesOptions
  ): Promise<ArangoResponseMetadata & CollectionProperties>;
  count(): Promise<ArangoResponseMetadata & CollectionPropertiesAndCount>;
  figures(): Promise<ArangoResponseMetadata & CollectionPropertiesAndFigures>;
  revision(): Promise<ArangoResponseMetadata & CollectionPropertiesAndRevision>;
  checksum(
    options?: CollectionChecksumOptions
  ): Promise<ArangoResponseMetadata & CollectionChecksum>;
  load(count?: boolean): Promise<ArangoResponseMetadata & CollectionLoadResult>;
  unload(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  rename(name: string): Promise<ArangoResponseMetadata & CollectionMetadata>;
  rotate(): Promise<boolean>;
  truncate(): Promise<ArangoResponseMetadata & CollectionMetadata>;
  drop(options?: CollectionDropOptions): Promise<ArangoResponseMetadata>;

  //#region crud
  getResponsibleShard(document: Partial<Document<T>>): Promise<string>;
  documentId(selector: DocumentSelector): string;
  documentExists(selector: DocumentSelector): Promise<boolean>;
  document(
    selector: DocumentSelector,
    options?: CollectionReadOptions
  ): Promise<Document<T>>;
  document(selector: DocumentSelector, graceful: boolean): Promise<Document<T>>;
  save(
    data: DocumentData<T>,
    options?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  saveAll(
    data: Array<DocumentData<T>>,
    options?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    options?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  replaceAll(
    newValues: Array<DocumentData<T> & ({ _key: string } | { _id: string })>,
    options?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    options?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Document<T>>>;
  updateAll(
    newValues: Array<
      Patch<DocumentData<T>> & ({ _key: string } | { _id: string })
    >,
    options?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Document<T>>[]>;
  remove(
    selector: DocumentSelector,
    options?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Document<T>>>;
  removeAll(
    selector: Array<DocumentSelector>,
    options?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Document<T>>[]>;
  import(
    data: Buffer | Blob | string,
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  import(
    data: string[][],
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  import(
    data: Array<DocumentData<T>>,
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  //#endregion

  //#region simple queries
  /** @deprecated ArangoDB 3.4 */
  list(type?: SimpleQueryAllKeys): Promise<ArrayCursor<string>>;
  /** @deprecated ArangoDB 3.4 */
  all(options?: SimpleQueryAllOptions): Promise<ArrayCursor<Document<T>>>;
  /** @deprecated ArangoDB 3.4 */
  any(): Promise<Document<T>>;
  /** @deprecated ArangoDB 3.4 */
  byExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryByExampleOptions
  ): Promise<ArrayCursor<Document<T>>>;
  /** @deprecated ArangoDB 3.4 */
  firstExample(example: Partial<DocumentData<T>>): Promise<Document<T>>;
  /** @deprecated ArangoDB 3.4 */
  removeByExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryRemoveByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryRemoveByExampleResult>;
  /** @deprecated ArangoDB 3.4 */
  replaceByExample(
    example: Partial<DocumentData<T>>,
    newValue: DocumentData<T>,
    options?: SimpleQueryReplaceByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryReplaceByExampleResult>;
  /** @deprecated ArangoDB 3.4 */
  updateByExample(
    example: Partial<DocumentData<T>>,
    newValue: Patch<DocumentData<T>>,
    options?: SimpleQueryUpdateByExampleOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryUpdateByExampleResult>;
  remove(
    selector: DocumentSelector,
    options?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Edge<T>>>;
  removeAll(
    selector: Array<DocumentSelector>,
    options?: CollectionRemoveOptions
  ): Promise<CollectionRemoveResult<Edge<T>>[]>;
  /** @deprecated ArangoDB 3.4 */
  lookupByKeys(keys: string[]): Promise<Document<T>[]>;
  /** @deprecated ArangoDB 3.4 */
  removeByKeys(
    keys: string[],
    options?: SimpleQueryRemoveByKeysOptions
  ): Promise<ArangoResponseMetadata & SimpleQueryRemoveByKeysResult<T>>;
  /** @deprecated ArangoDB 3.4 */
  fulltext(
    attribute: string,
    query: string,
    options?: SimpleQueryFulltextOptions
  ): Promise<ArrayCursor<Document<T>>>;
  //#endregion

  //#region indexes
  indexes(): Promise<Index[]>;
  index(selector: IndexSelector): Promise<Index[]>;
  ensureIndex(
    details: EnsureIndexFulltextOptions
  ): Promise<
    ArangoResponseMetadata & FulltextIndex & { isNewlyCreated: boolean }
  >;
  ensureIndex(
    details: EnsureIndexGeoOptions
  ): Promise<ArangoResponseMetadata & GeoIndex & { isNewlyCreated: boolean }>;
  ensureIndex(
    details: EnsureIndexHashOptions
  ): Promise<ArangoResponseMetadata & HashIndex & { isNewlyCreated: boolean }>;
  ensureIndex(
    details: EnsureIndexPersistentOptions
  ): Promise<
    ArangoResponseMetadata & PersistentIndex & { isNewlyCreated: boolean }
  >;
  ensureIndex(
    details: EnsureIndexSkiplistOptions
  ): Promise<
    ArangoResponseMetadata & SkiplistIndex & { isNewlyCreated: boolean }
  >;
  ensureIndex(
    details: EnsureIndexTtlOptions
  ): Promise<ArangoResponseMetadata & TtlIndex & { isNewlyCreated: boolean }>;
  dropIndex(
    selector: IndexSelector
  ): Promise<ArangoResponseMetadata & CollectionIndexResult>;
  //#endregion
}

/**
 * Represents an edge collection in a {@link Database}.
 *
 * See {@link DocumentCollection} for a more generic variant of this interface
 * more suited for regular document collections.
 */
export interface EdgeCollection<T extends object = any>
  extends DocumentCollection<T> {
  //#region crud
  edge(
    selector: DocumentSelector,
    options?: CollectionReadOptions
  ): Promise<Edge<T>>;
  edge(selector: DocumentSelector, graceful: boolean): Promise<Edge<T>>;
  document(
    selector: DocumentSelector,
    options?: CollectionReadOptions
  ): Promise<Edge<T>>;
  document(selector: DocumentSelector, graceful: boolean): Promise<Edge<T>>;
  save(
    data: EdgeData<T>,
    options?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  saveAll(
    data: Array<EdgeData<T>>,
    options?: CollectionInsertOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    options?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  replaceAll(
    newValues: Array<DocumentData<T> & ({ _key: string } | { _id: string })>,
    options?: CollectionReplaceOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    options?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Edge<T>>>;
  updateAll(
    newValues: Array<
      Patch<DocumentData<T>> & ({ _key: string } | { _id: string })
    >,
    options?: CollectionUpdateOptions
  ): Promise<CollectionSaveResult<Edge<T>>[]>;
  import(
    data: Buffer | Blob | string,
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  import(
    data: string[][],
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  import(
    data: Array<EdgeData<T>>,
    options?: CollectionImportOptions
  ): Promise<CollectionImportResult>;
  //#endregion

  //#region simple queries
  /** @deprecated ArangoDB 3.4 */
  all(options?: SimpleQueryAllOptions): Promise<ArrayCursor<Edge<T>>>;
  /** @deprecated ArangoDB 3.4 */
  any(): Promise<Edge<T>>;
  /** @deprecated ArangoDB 3.4 */
  byExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryByExampleOptions
  ): Promise<ArrayCursor<Edge<T>>>;
  /** @deprecated ArangoDB 3.4 */
  firstExample(example: Partial<DocumentData<T>>): Promise<Edge<T>>;
  /** @deprecated ArangoDB 3.4 */
  lookupByKeys(keys: string[]): Promise<Edge<T>[]>;
  /** @deprecated ArangoDB 3.4 */
  fulltext(
    attribute: string,
    query: string,
    options?: SimpleQueryFulltextOptions
  ): Promise<ArrayCursor<Edge<T>>>;
  //#endregion

  //#region edges
  edges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  inEdges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  outEdges(
    selector: DocumentSelector
  ): Promise<ArangoResponseMetadata & CollectionEdgesResult<T>>;
  /** @deprecated ArangoDB 3.4 */
  traversal(
    startVertex: DocumentSelector,
    options?: TraversalOptions
  ): Promise<any>;
  //#endregion
}

/**
 * The `Collection` type represents a collection in a {@link Database}.
 *
 * When using TypeScript, collections can be cast to {@link DocumentCollection}
 * or {@link EdgeCollection} in order to increase type safety.
 *
 * @param T - Type to use for document data. Defaults to `any`.
 *
 * @example
 * ```ts
 * interface Person {
 *   name: string;
 * }
 * interface Friend {
 *   startDate: number;
 *   endDate?: number;
 * }
 * const db = new Database();
 * const documents = db.collection("persons") as DocumentCollection<Person>;
 * const edges = db.collection("friends") as EdgeCollection<Friend>;
 * ```
 */
export class Collection<T extends object = any>
  implements EdgeCollection<T>, DocumentCollection<T> {
  //#region attributes
  protected _name: string;
  protected _idPrefix: string;
  protected _db: Database;
  //#endregion

  /** @hidden */
  constructor(db: Database, name: string) {
    this._name = name;
    this._idPrefix = `${this._name}/`;
    this._db = db;
  }

  //#region internals
  protected _get(path: string, qs?: any) {
    return this._db.request(
      { path: `/_api/collection/${this._name}/${path}`, qs },
      (res) => res.body
    );
  }

  protected _put(path: string, body?: any) {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/collection/${this._name}/${path}`,
        body,
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region metadata
  get isArangoCollection(): true {
    return true;
  }

  get name() {
    return this._name;
  }

  get() {
    return this._db.request(
      { path: `/_api/collection/${this._name}` },
      (res) => res.body
    );
  }

  async exists() {
    try {
      await this.get();
      return true;
    } catch (err) {
      if (isArangoError(err) && err.errorNum === COLLECTION_NOT_FOUND) {
        return false;
      }
      throw err;
    }
  }

  create(
    options?: CreateCollectionOptions & {
      type?: CollectionType;
    }
  ) {
    const {
      waitForSyncReplication = undefined,
      enforceReplicationFactor = undefined,
      ...opts
    } = options || {};
    const qs: Params = {};
    if (typeof waitForSyncReplication === "boolean") {
      qs.waitForSyncReplication = waitForSyncReplication ? 1 : 0;
    }
    if (typeof enforceReplicationFactor === "boolean") {
      qs.enforceReplicationFactor = enforceReplicationFactor ? 1 : 0;
    }
    return this._db.request(
      {
        method: "POST",
        path: "/_api/collection",
        qs,
        body: {
          ...opts,
          name: this.name,
        },
      },
      (res) => res.body
    );
  }

  properties(properties?: CollectionPropertiesOptions) {
    if (!properties) return this._get("properties");
    return this._put("properties", properties);
  }

  count() {
    return this._get("count");
  }

  figures() {
    return this._get("figures");
  }

  revision() {
    return this._get("revision");
  }

  checksum(options?: CollectionChecksumOptions) {
    return this._get("checksum", options);
  }

  load(count?: boolean) {
    return this._put(
      "load",
      typeof count === "boolean" ? { count: count } : undefined
    );
  }

  unload() {
    return this._put("unload");
  }

  async rename(name: string) {
    const result = await this._db.request(
      {
        method: "PUT",
        path: `/_api/collection/${this._name}/rename`,
        body: { name },
      },
      (res) => res.body
    );
    this._name = name;
    this._idPrefix = `${name}/`;
    return result;
  }

  async rotate() {
    const body = await this._put("rotate");
    return body.result;
  }

  truncate() {
    return this._put("truncate");
  }

  drop(options?: CollectionDropOptions) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/collection/${this._name}`,
        qs: options,
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region crud
  getResponsibleShard(document: Partial<Document<T>>): Promise<string> {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/collection/${this.name}/responsibleShard`,
        body: document,
      },
      (res) => res.body.shardId
    );
  }

  documentId(selector: DocumentSelector): string {
    return _documentHandle(selector, this._name);
  }

  documentExists(selector: DocumentSelector): Promise<boolean> {
    return this._db
      .request(
        {
          method: "HEAD",
          path: `/_api/document/${_documentHandle(selector, this._name)}`,
        },
        () => true
      )
      .catch((err) => {
        if (err.statusCode === 404) {
          return false;
        }
        throw err;
      });
  }

  document(
    selector: DocumentSelector,
    options: boolean | CollectionReadOptions = {}
  ) {
    if (typeof options === "boolean") {
      options = { graceful: options };
    }
    const { allowDirtyRead = undefined, graceful = false } = options;
    const result = this._db.request(
      {
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        allowDirtyRead,
      },
      (res) => res.body
    );
    if (!graceful) return result;
    return result.catch((err) => {
      if (isArangoError(err) && err.errorNum === DOCUMENT_NOT_FOUND) {
        return null;
      }
      throw err;
    });
  }

  edge(
    selector: DocumentSelector,
    options: boolean | CollectionReadOptions = {}
  ) {
    return this.document(selector, options) as Promise<Edge<T>>;
  }

  save(data: DocumentData<T>, options?: CollectionInsertOptions) {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/document/${this._name}`,
        body: data,
        qs: options,
      },
      (res) => res.body
    );
  }

  saveAll(data: Array<DocumentData<T>>, options?: CollectionInsertOptions) {
    return this._db.request(
      {
        method: "POST",
        path: `/_api/document/${this._name}`,
        body: data,
        qs: options,
      },
      (res) => res.body
    );
  }

  replace(
    selector: DocumentSelector,
    newValue: DocumentData<T>,
    options?: CollectionReplaceOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        body: newValue,
        qs: options,
      },
      (res) => res.body
    );
  }

  replaceAll(
    newValues: Array<DocumentData<T> & ({ _key: string } | { _id: string })>,
    options?: CollectionReplaceOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: `/_api/document/${this._name}`,
        body: newValues,
        qs: options,
      },
      (res) => res.body
    );
  }

  update(
    selector: DocumentSelector,
    newValue: Patch<DocumentData<T>>,
    options?: CollectionUpdateOptions
  ) {
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        body: newValue,
        qs: options,
      },
      (res) => res.body
    );
  }

  updateAll(
    newValues: Array<
      Patch<DocumentData<T>> & ({ _key: string } | { _id: string })
    >,
    options?: CollectionUpdateOptions
  ) {
    return this._db.request(
      {
        method: "PATCH",
        path: `/_api/document/${this._name}`,
        body: newValues,
        qs: options,
      },
      (res) => res.body
    );
  }

  remove(selector: DocumentSelector, options?: CollectionRemoveOptions) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/document/${_documentHandle(selector, this._name)}`,
        qs: options,
      },
      (res) => res.body
    );
  }

  removeAll(
    selectors: Array<DocumentSelector>,
    options?: CollectionRemoveOptions
  ) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/document/${this._name}`,
        body: selectors,
        qs: options,
      },
      (res) => res.body
    );
  }

  import(
    data: Buffer | Blob | string | any[],
    { type = "auto", ...options }: CollectionImportOptions = {}
  ): Promise<CollectionImportResult> {
    if (Array.isArray(data)) {
      data =
        (data as any[]).map((line: any) => JSON.stringify(line)).join("\r\n") +
        "\r\n";
    }
    return this._db.request(
      {
        method: "POST",
        path: "/_api/import",
        body: data,
        isBinary: true,
        qs: {
          type: type === null ? undefined : type,
          ...options,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region edges
  protected _edges(selector: DocumentSelector, direction?: "in" | "out") {
    return this._db.request(
      {
        path: `/_api/edges/${this._name}`,
        qs: {
          direction,
          vertex: _documentHandle(selector, this._name),
        },
      },
      (res) => res.body
    );
  }

  edges(vertex: DocumentSelector) {
    return this._edges(vertex);
  }

  inEdges(vertex: DocumentSelector) {
    return this._edges(vertex, "in");
  }

  outEdges(vertex: DocumentSelector) {
    return this._edges(vertex, "out");
  }

  traversal(startVertex: DocumentSelector, options?: TraversalOptions) {
    return this._db.request(
      {
        method: "POST",
        path: "/_api/traversal",
        body: {
          ...options,
          startVertex,
          edgeCollection: this._name,
        },
      },
      (res) => res.body.result
    );
  }
  //#endregion

  //#region simple queries
  list(type: SimpleQueryAllKeys = "id") {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/all-keys",
        body: { type, collection: this._name },
      },
      (res) => new ArrayCursor(this._db, res.body, res.arangojsHostId)
    );
  }

  all(options?: SimpleQueryAllOptions) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/all",
        body: {
          ...options,
          collection: this._name,
        },
      },
      (res) => new ArrayCursor(this._db, res.body, res.arangojsHostId)
    );
  }

  any() {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/any",
        body: { collection: this._name },
      },
      (res) => res.body.document
    );
  }

  byExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/by-example",
        body: {
          ...options,
          example,
          collection: this._name,
        },
      },
      (res) => new ArrayCursor(this._db, res.body, res.arangojsHostId)
    );
  }

  firstExample(example: Partial<DocumentData<T>>) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/first-example",
        body: {
          example,
          collection: this._name,
        },
      },
      (res) => res.body.document
    );
  }

  removeByExample(
    example: Partial<DocumentData<T>>,
    options?: SimpleQueryRemoveByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/remove-by-example",
        body: {
          ...options,
          example,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }

  replaceByExample(
    example: Partial<DocumentData<T>>,
    newValue: DocumentData<T>,
    options?: SimpleQueryReplaceByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/replace-by-example",
        body: {
          ...options,
          example,
          newValue,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }

  updateByExample(
    example: Partial<DocumentData<T>>,
    newValue: Patch<DocumentData<T>>,
    options?: SimpleQueryUpdateByExampleOptions
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/update-by-example",
        body: {
          ...options,
          example,
          newValue,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }

  lookupByKeys(keys: string[]) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/lookup-by-keys",
        body: {
          keys,
          collection: this._name,
        },
      },
      (res) => res.body.documents
    );
  }

  removeByKeys(keys: string[], options?: SimpleQueryRemoveByKeysOptions) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/remove-by-keys",
        body: {
          options: options,
          keys,
          collection: this._name,
        },
      },
      (res) => res.body
    );
  }
  //#endregion

  //#region indexes
  indexes() {
    return this._db.request(
      {
        path: "/_api/index",
        qs: { collection: this._name },
      },
      (res) => res.body.indexes
    );
  }

  index(selector: IndexSelector) {
    return this._db.request(
      { path: `/_api/index/${_indexHandle(selector, this._name)}` },
      (res) => res.body
    );
  }

  ensureIndex(
    options:
      | EnsureIndexHashOptions
      | EnsureIndexSkiplistOptions
      | EnsureIndexPersistentOptions
      | EnsureIndexGeoOptions
      | EnsureIndexFulltextOptions
      | EnsureIndexTtlOptions
  ) {
    return this._db.request(
      {
        method: "POST",
        path: "/_api/index",
        body: options,
        qs: { collection: this._name },
      },
      (res) => res.body
    );
  }

  dropIndex(selector: IndexSelector) {
    return this._db.request(
      {
        method: "DELETE",
        path: `/_api/index/${_indexHandle(selector, this._name)}`,
      },
      (res) => res.body
    );
  }

  fulltext(
    attribute: string,
    query: string,
    { index, ...options }: SimpleQueryFulltextOptions = {}
  ) {
    return this._db.request(
      {
        method: "PUT",
        path: "/_api/simple/fulltext",
        body: {
          ...options,
          index: index ? _indexHandle(index, this._name) : undefined,
          attribute,
          query,
          collection: this._name,
        },
      },
      (res) => new ArrayCursor(this._db, res.body, res.arangojsHostId)
    );
  }
  //#endregion
}
