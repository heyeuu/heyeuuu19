---
title: "喵喵小bug | 蓝牙键盘配对没有 PIN 码输入框"
description: "Arch Linux + Niri 下蓝牙键盘配对时没有 PIN 码输入弹窗的排查与解决。"
date: "2026-05-31"
draft: false
tags:
  - Bluetooth
  - Arch Linux
  - Niri
series: "喵喵小bug"
image:
  url: "https://me19.heyeuuu19.com/blog/astro/bluetooth.jpg"
  alt: "蓝牙键盘配对封面图"
---

## 1. 前景提要

在 Arch Linux + Niri 环境下，尝试配对蓝牙键盘时，系统始终不弹出 PIN 码输入框，导致配对流程无法完成。

在通过 `bluetoothctl` 连接，看到如下报错：

```text
Authentication Canceled
```

## 2. 原因分析

从前我使用 KDE ，配对蓝牙键盘时，系统会自动弹出 PIN 码输入框，但在 Niri 中却不会弹出。

在 Niri 这种独立 Wayland 窗口管理器中，不弹出 PIN 码输入框的根本原因是缺少两个组件：

1. **Polkit 认证代理**：系统底层需要权限验证时，没有组件能弹出图形输入框。
2. **蓝牙 Agent**：没有蓝牙配对代理来处理 PIN 码交互请求。

GNOME/KDE 等完整桌面环境会自带这些组件，但 Niri 只负责窗口管理和布局渲染，不会自动启动这些服务。

## 3. 解决方式

### 方案一：终端指定 Agent

在 `bluetoothctl` 中手动指定 Agent，让终端充当 PIN 码输入界面：

```bash
bluetoothctl
agent KeyboardOnly
default-agent
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
```

> `XX:XX:XX:XX:XX:XX` 是蓝牙设备的 MAC 地址，可通过 `devices` 命令查看。

配对键盘时，终端会显示一串 PIN 码，需要在蓝牙键盘上盲敲这串数字后按 Enter。

### 方案二：配置图形化代理

安装必要组件：

```bash
sudo pacman -S polkit-gnome blueman libnotify
```

在 Niri 配置文件 `~/.config/niri/config.kdl` 的 `spawn-at-startup` 中添加：

```kdl
spawn-at-startup "/usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1"
spawn-at-startup "blueman-applet"
```

注销并重新登录后生效。这样以后系统需要权限验证时，就能自动弹出图形输入框了。

## 4. 关键概念：Agent 是什么

在 BlueZ 架构中，Agent 是底层蓝牙服务与用户之间的"中介"。它负责：

- 向用户请求 PIN 码
- 确认配对信息
- 处理安全验证交互

不同设备的 IO 能力对应不同的 Agent 模式：

| 参数 | 含义 | 适用场景 |
| --- | --- | --- |
| KeyboardOnly | 只有输入能力 | 蓝牙键盘配对 |
| DisplayOnly | 只有输出能力 | 车载屏幕 |
| DisplayYesNo | 有屏+确认键 | 耳机/鼠标配对 |
| KeyboardDisplay | 有屏有键盘 | 完整图形界面 Agent |
| NoInputNoOutput | 无输入输出 | 低功耗蓝牙标签 |

## 5. 参考

- BlueZ Agent 文档：<https://kernel.org/doc/html/latest/driver-api/bluetooth.html>
- Arch Wiki 蓝牙：<https://wiki.archlinux.org/title/Bluetooth>
