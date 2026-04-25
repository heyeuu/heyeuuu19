---
title: "喵喵小bug | Eigen::LDLT 分解"
description: "一次 Eigen LDLT 断言失败的排查记录：根因是临时对象生命周期与惰性求值的组合问题。"
date: "2026-04-25"
draft: false
tags:
  - C++
  - Eigen
  - Debug
  - Kalman Filter
series: "喵喵小bug"
image:
  url: "https://me19.heyeuuu19.com/blog/astro/eigen_LDLT.jpg"
  alt: "Eigen LDLT 断言排查"
---

## 1. 前景提要

在计算 Kalman 增益时，我遇到了如下报错：

```text
Assertion m_isInitialized && "LDLT is not initialized." failed.
Aborted (core dumped)
```

本次问题的根因不是矩阵公式本身，而是 Eigen 表达式模板的惰性求值机制与临时对象生命周期叠加后产生的悬空引用。

## 2. 报错复现

错误写法：

```cpp
auto K = P_ * H.transpose() * S.ldlt().solve(RMat::Identity());
```

这行代码在语法上合法，但存在生命周期风险。

## 3. 原因分析

1. `S.ldlt()` 先创建一个临时 `LDLT` 分解对象。
2. 随后调用 `.solve(...)` 时，Eigen 返回的是一个表达式对象，而不是立即完成计算的矩阵。这个表达式对象内部会引用前面的 `LDLT` 对象。
3. 由于使用了 `auto K`，`K` 会被推导为表达式类型，而不是具体矩阵类型。
4. 语句在分号结束后，`S.ldlt()` 产生的临时对象立即析构。
5. 当后续代码真正使用 `K` 时，Eigen 才开始按表达式求值；此时表达式中引用的 `LDLT` 对象已经失效，最终触发 `m_isInitialized` 断言失败。

## 4. 修复方式

推荐写法：

```cpp
const auto ldlt = S.ldlt();
const RMat K = P_ * H.transpose() * ldlt.solve(RMat::Identity());
```

这样做有两个作用：

- `ldlt` 具名后，生命周期可控，不会在语句末尾立即销毁。
- `K` 显式为矩阵类型，会得到实际计算结果，而不是延迟表达式。

也可以使用 `.eval()` 强制物化结果：

```cpp
const auto ldlt = S.ldlt();
auto K = (P_ * H.transpose() * ldlt.solve(RMat::Identity())).eval();
```

## 5. 参考

- Eigen Pitfalls: <https://eigen.tuxfamily.org/dox/TopicPitfalls.html>
- Eigen LDLT 文档: <https://eigen.tuxfamily.org/dox/classEigen_1_1LDLT.html>
