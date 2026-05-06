declare module 'cache-manager-fs-hash' {
    /**
     * 锁文件配置选项
     */
    interface LockFileOptions {
        /** 等待时间（毫秒） */
        wait?: number;
        /** 轮询周期（毫秒） */
        pollPeriod?: number;
        /** 锁过期时间（毫秒） */
        stale?: number;
        /** 重试次数 */
        retries?: number;
        /** 重试等待时间（毫秒） */
        retryWait?: number;
    }

    /**
     * DiskStore 构造函数选项
     */
    interface DiskStoreOptions {
        /** 缓存文件路径 (默认: './cache') */
        path?: string;
        /** 过期时间，单位毫秒 (默认: Infinity 永不过期) */
        ttl?: number;
        /** 是否压缩文件以节省磁盘空间 (默认: false) */
        zip?: boolean;
        /** 是否创建子目录 (默认: 取决于 hash 选项) */
        subdirs?: boolean;
        /** 是否使用哈希生成文件名 (默认: true)，设为 false 则使用原始 key 作为文件名 */
        hash?: boolean;
        /** 锁文件配置 */
        lockFile?: LockFileOptions;
    }

    /**
     * DiskStore 类 - 基于文件系统的缓存存储
     * 兼容 cache-manager v4, v5, v7
     */
    export class DiskStore {
        /** 用于兼容 cache-manager v4/v5 */
        store: this;
        /** 用于兼容 cache-manager v7 */
        stores: DiskStore[];

        /**
         * 构造函数
         * @param options 配置选项
         */
        constructor(options?: DiskStoreOptions);

        /**
         * 设置缓存
         * @param key 缓存键
         * @param val 缓存值
         * @param ttl 可选，自定义 TTL（毫秒），也可以传入 {ttl: number} 对象
         */
        set(key: string, val: any, ttl?: number | { ttl: number }): Promise<void>;

        /**
         * 获取缓存
         * @param key 缓存键
         * @returns 缓存值，如果不存在或已过期则返回 undefined
         */
        get(key: string): Promise<any>;

        /**
         * 检查键是否存在
         * @param key 缓存键
         * @returns 是否存在
         */
        has(key: string): Promise<boolean>;

        /**
         * 删除缓存
         * @param key 缓存键
         */
        del(key: string): Promise<void>;

        /**
         * 删除缓存（del 的别名，兼容 cache-manager v7）
         * @param key 缓存键
         */
        delete(key: string): Promise<void>;

        /**
         * 获取缓存剩余 TTL
         * @param key 缓存键
         * @returns 剩余 TTL（毫秒），如果不存在则返回 0
         */
        ttl(key: string): Promise<number>;

        /**
         * 删除所有缓存文件
         */
        reset(): Promise<void>;

        /**
         * 删除所有缓存文件（reset 的别名，兼容 cache-manager v7）
         */
        clear(): Promise<void>;

        /**
         * 批量设置缓存
         * @param keyValues 键值对列表，最后可以附带 ttl
         * @example
         * await mset('key1', 'val1', 'key2', 'val2', 1000);
         */
        mset(...keyValues: (string | any | number)[]): Promise<void>;

        /**
         * 批量获取缓存
         * @param keys 缓存键列表
         * @returns 缓存值列表
         */
        mget(...keys: string[]): Promise<any[]>;

        /**
         * 批量获取缓存（mget 的别名，兼容 cache-manager v7）
         * @param keys 缓存键列表
         * @returns 缓存值列表
         */
        getMany(...keys: string[]): Promise<any[]>;

        /**
         * 批量设置缓存（mset 的别名，兼容 cache-manager v7）
         * @param keyValues 键值对列表
         */
        setMany(...keyValues: (string | any | number)[]): Promise<void>;

        /**
         * 批量删除缓存
         * @param keys 缓存键列表
         */
        mdel(...keys: string[]): Promise<void>;

        /**
         * 批量删除缓存（mdel 的别名，兼容 cache-manager v7）
         * @param keys 缓存键列表
         */
        deleteMany(...keys: string[]): Promise<void>;

        /**
         * 获取所有键（未实现，会抛出错误）
         * @throws Error 该方法未实现
         */
        keys(): Promise<string[]>;
    }
}
