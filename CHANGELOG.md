# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.1.3](https://github.com/isdk/proxy.js/compare/v0.1.2...v0.1.3) (2026-05-11)


### Features

* add offline mode with prefetch and enhance cache matching ([5fe5711](https://github.com/isdk/proxy.js/commit/5fe571198870b364bf89e5ae86139facf247a25f))
* **SmartCache:** add clearPersistent param to clear method ([4cd6a2b](https://github.com/isdk/proxy.js/commit/4cd6a2b4636a73c208a7b651e329cb4abc6ffff6))
* **SmartCache:** add clearPersistent parameter to delete method ([9adb677](https://github.com/isdk/proxy.js/commit/9adb6771a15ced80815da7db0317827f411b140f))

## [0.1.2](https://github.com/isdk/proxy.js/compare/v0.1.1...v0.1.2) (2026-05-08)


### Features

* 迁移 SmartCache L1 缓存到 secondary-cache，支持 maxTotalMemorySize 内存限制 ([fdc4437](https://github.com/isdk/proxy.js/commit/fdc4437cc5c15b4d7a8d6b0cb5d892dc77fa8c1d))
* 添加正则匹配和站点配置功能 ([c8b5a29](https://github.com/isdk/proxy.js/commit/c8b5a29885c11ff30026d6852cefa71e6553f260))
* 支持 HTTP POST/PUT 缓存及精细化规则配置 ([7947e56](https://github.com/isdk/proxy.js/commit/7947e56504d9a4e1d392bd56b12d806b7095e5b7))


### Bug Fixes

* 修复并发请求合并时的错误处理和SWR重复触发问题 ([12185e1](https://github.com/isdk/proxy.js/commit/12185e12b99f5c688221f4cfc820c6eb17571dcd))


### Refactor

* **types:** 重构 BodyFilterConfig 类型定义 ([6b71e80](https://github.com/isdk/proxy.js/commit/6b71e80ca2c47c728a00f2101ccbd71624c711e4))

## 0.1.1 (2026-05-07)


### Features

* 支持 createFetchWithCache 和 createCachedFetch 传入 activeCacheWrites ([bed37fa](https://github.com/isdk/proxy.js/commit/bed37fa43507dcbe5cdfa453876163571399d761))
* **proxy:** refactor caching engine to support streaming, request coalescing and offline resilience ([ba7c2d5](https://github.com/isdk/proxy.js/commit/ba7c2d59f40676fe8f507d6f5b2a3da44b4dd73b))
