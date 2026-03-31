---
title: "控制工程 | 扫频Frequency Sweep"
description: "扫频简述。"
date: "2026-03-31"
draft: false
image:
  url: "https://me19.heyeuuu19.com/blog/control/frequency_sweep.png"
  alt: "扫频封面图"
---

在控制系统中，扫频是获取系统频率特性（Frequency Response）最直接、最可靠的实验手段。它通过向系统注入一系列频率变化的信号，观察输出信号增益的衰减和相位的滞后，从而构建出伯德图（Bode Plot）。

## 1. 核心概念回顾

### 什么是扫频？

扫频是指输入信号的频率 $\omega$ 随时间连续或离散变化的过程。最常见的输入信号是正弦波：

$$
u(t) = A \sin(\phi(t))
$$

其中 $\phi(t)$ 是相位。

在离散扫频中，频率分段固定；在连续扫频（Chirp 信号）中，瞬时频率为：

$$
\omega(t) = \frac{d\phi}{dt}
$$

### 物理本质

根据线性定常系统（LTI）的特性，若输入为 $A \sin(\omega t)$，则稳态输出必为：

$$
y(t) = B \sin(\omega t + \theta)
$$

扫频的任务就是测量在不同 $\omega$ 下的：

- 幅值比（增益）：$M(\omega) = \frac{B}{A}$
- 相位差：$\theta(\omega)$

## 2. 深度拆解：扫频的实现逻辑

扫频在底层并非简单的信号发送，而是一个精密计算的闭环过程，主要分为以下三个技术模块。

### 2.1 激励信号生成（数字相位累加器）

在数字控制系统中，生成平滑的正弦信号通常采用直接数字频率合成（DDS）的思想。

逻辑：通过累加相位步长来计算瞬时相位 $\phi(k)$。

$$
\phi(k) = \phi(k-1) + \omega(k) \cdot T_s
$$

其中 $T_s$ 为采样周期，$\omega(k)$ 是当前时刻的目标角频率。

优势：这种方式可以保证频率在切换时相位连续（Phase Continuous），避免因为信号跳变引起机械冲击。

### 2.2 频率成分提取（相关分析法）与数学证明

这是扫频逻辑中最核心的“数学过滤”环节。为了从带有噪声和干扰的输出 $y(t)$ 中提取出特定频率 $\omega$ 的响应，算法会将输出信号与两个正交的参考信号进行相关运算。

#### 1) 乘法运算与求和（低通滤波）

在 $N$ 个完整扫频周期对应的离散采样点上进行累加（$N$ 为离散采样点数）：

- 实部（Real）：$Re = \sum_{k=1}^{N} y(k) \sin(\omega k T_s)$
- 虚部（Imag）：$Im = \sum_{k=1}^{N} y(k) \cos(\omega k T_s)$

#### 2) 核心原理解析：正交解调的数学真相

1. 基准（零度)

在扫频测试中，系统通常输出正弦激励，设激励为 $\sin(\omega t)$。既然激励是 $\sin(\omega t)$，分析返回输出 $y(t)$ 时，自然把 $\sin(\omega t)$ 当作 $0^\circ$ 的相位基准（复平面中的实轴）。

- 与基准同相（$0^\circ$ 相位差）的信号是 $\sin(\omega t)$。
- 与基准正交（超前 $90^\circ$）的信号是 $\sin(\omega t + 90^\circ) = \cos(\omega t)$。

因此在该工程定义下，$\sin$ 对应“实轴基准”，$\cos$ 对应“虚轴正交分量”。

2. 分析

假设系统返回真实信号为：

$$
y(t) = B\sin(\omega t + \theta)
$$

利用两角和公式展开：

$$
y(t) = B\sin(\omega t + \theta) = (B\cos\theta)\sin(\omega t) + (B\sin\theta)\cos(\omega t)
$$

可见输出被拆成两部分：

- 随 $\sin(\omega t)$ 的系数为 $B\cos\theta$，即在“实轴基准”上的投影。
- 随 $\cos(\omega t)$ 的系数为 $B\sin\theta$，即在“正交虚轴”上的投影。

3. Q&A：为什么 Re 乘 sin？

- 提取实轴投影（Re）：用 $y(t)$ 乘 $\sin(\omega t)$ 并积分/求和。根据正交性，$\cos$ 项会被消除，结果正比于 $B\cos\theta$。
- 提取虚轴投影（Im）：用 $y(t)$ 乘 $\cos(\omega t)$ 并积分/求和。$\sin$ 项被消除，结果正比于 $B\sin\theta$。

总结：

- $Re = \sum y(k)\sin(\dots)$：提取与激励信号步调一致（同相）的能量。
- $Im = \sum y(k)\cos(\dots)$：提取与激励信号相差 $90^\circ$（正交）的能量。

如果激励改成 $\cos(\omega t)$，公式会相应互换。关键在于工程实现中，谁被定义为参考坐标轴的“零相位”。

#### 3) 幅值与相位转换

在一个完整周期内累加 $N$ 个点后：

$$
Re = \frac{N}{2} \cdot B \cos(\theta) \quad \Rightarrow \quad B \cos(\theta) = \frac{2}{N} Re
$$

$$
Im = \frac{N}{2} \cdot B \sin(\theta) \quad \Rightarrow \quad B \sin(\theta) = \frac{2}{N} Im
$$

通过勾股定理求幅值：

$$
B = \sqrt{(B \cos\theta)^2 + (B \sin\theta)^2} = \frac{2}{N} \sqrt{Re^2 + Im^2}
$$

通过反正切求相位：

$$
\theta = \arctan\left(\frac{B \sin\theta}{B \cos\theta}\right) = \arctan2(Im, Re)
$$

### 2.3 注入方式选择

扫频逻辑的实施位置决定了你识别的是系统的哪一部分：

- Plant 识别：将信号注入到控制器输出，识别机械结构的频率特性。
- 闭环系统识别：将信号注入到位置或速度设定点，识别整个控制环路的跟踪能力和带宽。

## 3. 实验质量的准绳：相干性（Coherence）

在扫频实验中，仅有幅值和相位是不够的，我们必须知道数据的可信度。

### 3.1 什么是相干性？

相干性 $\gamma^2(\omega)$ 是一个介于 $0$ 到 $1$ 之间的实数，衡量输出信号中有多大比例是由输入信号通过线性系统产生的。

- $\gamma^2 = 1$：完美线性、无噪声，数据极度可靠。
- $\gamma^2 < 0.8$：数据受到严重干扰或系统表现出强非线性，需谨慎参考。

### 3.2 导致相干性下降的原因

- 外界噪声：环境振动或电磁干扰叠加到输出上。
- 非线性特性：系统存在摩擦、死区、饱和或间隙，导致能量转移到谐波。
- 其他输入：系统运行中受到未被记录的外部扰动。
- 幅值不足：激励信号太弱，输出被背景噪声淹没。

## 4. 技术补偿：陷波滤波器（Notch Filter）

通过扫频和相干性确认共振峰后，可使用陷波滤波器进行精准切除。

### 4.1 数学模型

$$
G_{notch}(s) = \frac{s^2 + 2\zeta_z \omega_n s + \omega_n^2}{s^2 + 2\zeta_p \omega_n s + \omega_n^2}
$$

### 4.2 深度与宽度的调校

- 深度（Depth）：由 $\zeta_z$ 决定，负责抵消共振峰高度。
- 宽度（Width）：由 $\zeta_p$ 决定，负责覆盖共振带范围。
- 原则：深度应刚好填平峰值，宽度应略大于共振带宽以容忍参数漂移。

## 5. 扫频流程

1. 参数定义：设定频率范围（$f_{start}$ 到 $f_{end}$）、信号幅值和分辨率。
2. 信号注入：将激励叠加在设定值或控制输出上。
3. 同步采集：确保 $u(t)$ 与 $y(t)$ 时间戳严格对齐，采样频率足够高。
4. 结果计算：利用 FFT 或相关法计算 $H(j\omega)$，并计算相干性 $\gamma^2(\omega)$。
5. 波特图校验：若共振点附近相干性保持高位，则该模型可用于滤波器设计。

## 6. 扫频方式对比表

| 特性     | 步进扫频（Stepped Sweep）    | 连续扫频（Chirp Sweep）  |
| -------- | ---------------------------- | ------------------------ |
| 精度     | 极高，等待系统进入稳态       | 较高，受频率变化率影响   |
| 效率     | 慢，每个点需等待数个周期     | 快，一次激励覆盖全频段   |
| 适用场景 | 离线精确建模、复杂非线性分析 | 在线自整定、快速生产测试 |

## 7. 扫频代码

下面给出两套代码：

- `C++`：更贴近实时控制器里的步进扫频与相关法提取。
- `Python`：更适合离线分析、快速验证频响和相干性。

### 7.1 e.g. 步进扫频（DDS 相位连续 + Re/Im 提取）

```cpp
#include <algorithm>
#include <cmath>
#include <functional>
#include <iostream>
#include <numbers>
#include <stdexcept>
#include <vector>

struct SweepConfig {
  double fs_hz = 5000.0;        // 采样频率
  double amp = 0.05;            // 注入幅值 A
  double f_start_hz = 1.0;      // 起始频率
  double f_end_hz = 300.0;      // 结束频率
  int points_per_decade = 12;   // 每十倍频点数（对数扫频）
  int settle_cycles = 6;        // 每频点稳态等待周期数
  int measure_cycles = 12;      // 每频点测量周期数
  bool log_spacing = true;      // true=对数扫频，false=线性扫频
  int linear_points = 100;      // 线性扫频点数（log_spacing=false时生效）
};

struct SweepPoint {
  double f_hz;
  double gain;      // 线性增益 B/A
  double gain_db;   // 20*log10(gain)
  double phase_deg; // 相位（度）
};

using PlantStep = std::function<double(double)>; // 输入 u，返回输出 y

std::vector<double> make_frequency_grid(const SweepConfig &cfg) {
  if (cfg.f_start_hz <= 0.0 || cfg.f_end_hz <= cfg.f_start_hz) {
    throw std::invalid_argument("invalid frequency range");
  }

  std::vector<double> freqs;
  if (cfg.log_spacing) {
    const double decades = std::log10(cfg.f_end_hz / cfg.f_start_hz);
    const int n = std::max(2, static_cast<int>(std::ceil(decades * cfg.points_per_decade)) + 1);
    freqs.reserve(static_cast<size_t>(n));
    for (int i = 0; i < n; ++i) {
      const double r = static_cast<double>(i) / static_cast<double>(n - 1);
      freqs.push_back(cfg.f_start_hz * std::pow(10.0, decades * r));
    }
  } else {
    const int n = std::max(2, cfg.linear_points);
    freqs.reserve(static_cast<size_t>(n));
    for (int i = 0; i < n; ++i) {
      const double r = static_cast<double>(i) / static_cast<double>(n - 1);
      freqs.push_back(cfg.f_start_hz + (cfg.f_end_hz - cfg.f_start_hz) * r);
    }
  }
  return freqs;
}

std::vector<SweepPoint> run_stepped_sweep(const SweepConfig &cfg, const PlantStep &plant_step) {
  if (cfg.fs_hz <= 0.0 || cfg.amp <= 0.0) {
    throw std::invalid_argument("fs_hz and amp must be positive");
  }

  const auto freqs = make_frequency_grid(cfg);
  std::vector<SweepPoint> out;
  out.reserve(freqs.size());

  double phase = 0.0; // DDS 相位连续
  const double two_pi = 2.0 * std::numbers::pi;
  auto wrap_2pi = [two_pi](double x) {
    x = std::fmod(x, two_pi);
    return (x < 0.0) ? (x + two_pi) : x;
  };

  for (double f : freqs) {
    const double w = two_pi * f;
    const double dphi = w / cfg.fs_hz;

    const int settle_n = std::max(1, static_cast<int>(std::lround(cfg.settle_cycles * cfg.fs_hz / f)));
    const int meas_n = std::max(1, static_cast<int>(std::lround(cfg.measure_cycles * cfg.fs_hz / f)));

    // 1) 稳态等待
    for (int k = 0; k < settle_n; ++k) {
      const double u = cfg.amp * std::sin(phase);
      (void)plant_step(u);
      phase = wrap_2pi(phase + dphi);
    }

    // 2) 相关法提取 Re / Im
    double re = 0.0;
    double im = 0.0;
    for (int k = 0; k < meas_n; ++k) {
      const double s = std::sin(phase);
      const double c = std::cos(phase);
      const double u = cfg.amp * s;
      const double y = plant_step(u);

      re += y * s; // 同相分量
      im += y * c; // 正交分量
      phase = wrap_2pi(phase + dphi);
    }

    const double b_cos = 2.0 * re / static_cast<double>(meas_n);
    const double b_sin = 2.0 * im / static_cast<double>(meas_n);
    const double b = std::hypot(b_cos, b_sin);
    const double gain = b / cfg.amp;
    const double phase_deg = std::atan2(b_sin, b_cos) * 180.0 / std::numbers::pi;

    out.push_back({
        .f_hz = f,
        .gain = gain,
        .gain_db = 20.0 * std::log10(std::max(gain, 1e-12)),
        .phase_deg = phase_deg,
    });
  }

  return out;
}

int main() {
  SweepConfig cfg; // 直接改这里的默认值即可

  // 示例被控对象：一阶低通 y[k] = a*y[k-1] + (1-a)*u[k]
  double y_state = 0.0;
  const double tau = 0.02; // 时间常数 20ms
  const double a = std::exp(-1.0 / (cfg.fs_hz * tau));
  PlantStep plant = [&](double u) {
    y_state = a * y_state + (1.0 - a) * u;
    return y_state;
  };

  const auto points = run_stepped_sweep(cfg, plant);
  std::cout << "f_hz,gain_db,phase_deg\n";
  for (const auto &p : points) {
    std::cout << p.f_hz << "," << p.gain_db << "," << p.phase_deg << "\n";
  }
}
```

### 7.2 e.g. 离线 FRF + 相干性

```python
from dataclasses import dataclass
import numpy as np
from scipy import signal


@dataclass
class SweepConfig:
    fs_hz: float = 5000.0
    duration_s: float = 20.0
    amp: float = 0.05
    f_start_hz: float = 1.0
    f_end_hz: float = 300.0
    chirp_method: str = "logarithmic"  # linear / logarithmic
    nperseg: int = 4096


def build_chirp(cfg: SweepConfig):
    t = np.arange(0.0, cfg.duration_s, 1.0 / cfg.fs_hz)
    u = cfg.amp * signal.chirp(
        t,
        f0=cfg.f_start_hz,
        t1=cfg.duration_s,
        f1=cfg.f_end_hz,
        method=cfg.chirp_method,
    )
    return t, u


def estimate_frf_and_coherence(u: np.ndarray, y: np.ndarray, cfg: SweepConfig):
    f, syu = signal.csd(y, u, fs=cfg.fs_hz, nperseg=cfg.nperseg)
    _, suu = signal.welch(u, fs=cfg.fs_hz, nperseg=cfg.nperseg)
    _, syy = signal.welch(y, fs=cfg.fs_hz, nperseg=cfg.nperseg)

    h = syu / (suu + 1e-18)
    mag_db = 20.0 * np.log10(np.maximum(np.abs(h), 1e-18))
    phase_deg = np.unwrap(np.angle(h)) * 180.0 / np.pi
    coh = np.clip(np.abs(syu) ** 2 / (suu * syy + 1e-18), 0.0, 1.0)

    return f, mag_db, phase_deg, coh


def simulate_plant(u: np.ndarray, cfg: SweepConfig):
    # 示例二阶系统（可替换成实测 y）
    fn = 80.0  # 共振频率 Hz
    zeta = 0.05
    wn = 2.0 * np.pi * fn
    num = [wn**2]
    den = [1.0, 2.0 * zeta * wn, wn**2]
    sys = signal.TransferFunction(num, den)
    t = np.arange(len(u)) / cfg.fs_hz
    _, y, _ = signal.lsim(sys, U=u, T=t)
    return y


if __name__ == "__main__":
    cfg = SweepConfig()  # 改这里的默认值
    t, u = build_chirp(cfg)
    y = simulate_plant(u, cfg)  # 实际应用中替换为采集到的输出
    f, mag_db, phase_deg, coh = estimate_frf_and_coherence(u, y, cfg)

    print("freq_hz,mag_db,phase_deg,coherence")
    for i in range(0, len(f), max(1, len(f) // 20)):
        print(f"{f[i]:.2f},{mag_db[i]:.2f},{phase_deg[i]:.2f},{coh[i]:.3f}")
```


