# 二维码识别 · dsh-qr-scanner

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）加一个「输入图片 → 拿到二维码里的链接」的能力。

设置页里把图拖进去、选一张、或者直接 `Ctrl+V` 粘贴截图；也可以在对话里让 agent 读本地图片文件，拿回二维码里的链接。

- 解码在**本机**完成，不联网、不上传。
- **零运行时依赖**：`jsQR`、`pngjs`、`jpeg-js` 已随包 vendored，安装时不需要构建、不需要联网拉依赖。
- 一个解码核心，两个入口：设置页（Web UI）和 agent 工具 `read_qr_code`。

```
拖图 / 选文件 / 粘贴  ──►  设置 → 二维码识别  ──►  链接 + 复制 / 打开
read_qr_code("a.png") ──►  agent 拿到链接
```

---

## 它能做什么

**设置页（Web UI）**

- 拖拽图片进虚线框、点击选择文件、或让虚线框获得焦点后 `Ctrl+V` 粘贴截图（截图工具直接截完就能粘）。
- 识别结果给出可点击的链接，并提供「复制内容 / 打开链接 / 换一张」。
- 反色二维码、截图里偏小的二维码、超大图（自动缩到最长边 2400px）都能处理。
- 一张图里有多个二维码时，显示第一个。

**agent 工具 `read_qr_code`**

- 给一个本地 PNG / JPEG 路径，返回二维码里的文本；是链接时还会标出 `kind: "url"`。
- 适合「这个功能怎么用 / 帮我读一下 D 盘那张图里的码」这类对话。

---

## 安装

> 需要 dsh 桌面端或 Web GUI。安装宿主部分后，**前端设置页需要刷新页面**才出现。

### 方式一：从插件市场安装（收录后）

1. 打开 DSH → **设置 → 插件 → 市场**。
2. 搜索「二维码识别」或 `dsh-qr-scanner`。
3. 点安装。
4. 刷新页面（`Ctrl+R`），打开 **设置 → 二维码识别**。

### 方式二：从 GitHub 源码安装

先把仓库放到本地任意目录：

```bash
git clone https://github.com/ghc2019/dsh-qr-scanner.git D:\dsh\plugins\dsh-qr-scanner
```

**2A. 让 DSH 里的 agent 装（最省事）**

对 agent 说：

> 用 plugin_manager 把 `D:\dsh\plugins\dsh-qr-scanner` 这个目录作为 bundle 安装。

等价于调用 `plugin_manager` 的 `install_bundle`，`target` 填该目录。装完刷新页面。

**2B. 手动安装（不借助 agent）**

1. 建目录链接（Windows 用 junction，不需要管理员权限）：

   ```powershell
   New-Item -ItemType Junction `
     -Path "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-qr-scanner" `
     -Target "D:\dsh\plugins\dsh-qr-scanner"
   ```

2. 编辑 `%USERPROFILE%\.dsh\profiles\desktop\package.json`，加两处：

   ```jsonc
   {
     "dependencies": {
       "dsh-qr-scanner": "link:D:/dsh/plugins/dsh-qr-scanner"
     },
     "dsh": {
       "profile": {
         "bundles": [
           // ……原有的 bundle 保持不动……
           "dsh-qr-scanner"
         ]
       }
     }
   }
   ```

3. 重启 DSH（宿主部分在启动时加载），再刷新页面。

> macOS / Linux：把 `New-Item -ItemType Junction` 换成 `ln -s`，profile 目录是 `~/.dsh/profiles/<配置名>/`，`link:` 后面写绝对路径。

### 验证装好了

- **设置**里出现「二维码识别」这一项；
- 问 agent「你现在有 `read_qr_code` 工具吗」，有就说明宿主部分已加载；
- 随便找一张二维码图片丢进设置页，能出链接。

---

## 使用

### 设置页

1. **设置 → 二维码识别**。
2. 拖入图片 / 点击虚线框选择文件 / 聚焦虚线框后 `Ctrl+V`。
3. 结果区出现链接后：**复制内容**、**打开链接**、或**换一张**。

### 在对话里用工具

```jsonc
read_qr_code({ "path": "C:\\Users\\me\\Desktop\\code.png" })
```

返回二维码里的内容，例如：

```
https://example.com/invite?code=ABC123&from=qr
```

工具返回字段：`ok`、`text`、`kind`（`url` / `text`）、`count`、`format`、`error`。

> ⚠️ 聊天里直接贴的图片没有宿主文件路径，agent 读不到。那种情况请用设置页（浏览器解码后把像素交给同一个解码核心）。

---

## 支持的格式

| 入口 | 能吃的图片 | 说明 |
| --- | --- | --- |
| 设置页 | 浏览器能解码的任意图片：PNG、JPEG、WebP、GIF、AVIF、BMP… | 先画到 canvas 取像素，再交给宿主解码，所以格式覆盖面跟着浏览器走 |
| `read_qr_code` 工具 | **仅 PNG / JPEG** | 内置纯 JS 解码器，刻意不引入原生模块（装的时候不用构建授权） |

其他格式想走工具：先转成 PNG/JPEG。

---

## 限制

- 一张图里有多个二维码时只返回第一个。
- 设置页会把图缩到最长边 2400px 再识别——正常情况下比这更清晰就够；特别小的码建议直接截二维码本身。
- 工具侧上限：单文件 48 MB、4000 万像素。
- 只读二维码，不生成二维码。

---

## 隐私

- 设置页的像素只发往**本机** DSH 宿主（`127.0.0.1`）的 `/plugin/qr-scanner/decode`，不经过任何第三方服务。
- `read_qr_code` 直接读本地文件，不外传。
- 插件不采集、不上报任何数据。

---

## 实现

- **宿主**（`index.js`）：注册 agent 工具 `read_qr_code` 和一条 `POST /plugin/qr-scanner/decode?w=&h=` 路由。
- **解码核心**（`lib/decode.js`）：`jsQR` 做识别（`inversionAttempts: 'attemptBoth'` 直接覆盖反色码）；整帧找不到时才切 2×2 带重叠的四块再试。
- **前端**（`client.js`）：`settings.section` 一个设置页；`createImageBitmap` → canvas → RGBA 像素 → POST 给宿主。
- **零依赖**：`jsQR` 1.4.0（Apache-2.0）、`pngjs` 7.0.0（MIT）、`jpeg-js` 0.4.4（Apache-2.0）原样放在 `vendor/`，见 [`vendor/PROVENANCE.md`](vendor/PROVENANCE.md)。

```
index.js            宿主：read_qr_code 工具 + 解码路由
lib/decode.js       解码核心（两个入口共用）
client.js           设置页 UI
vendor/             jsQR / pngjs / jpeg-js 及各自 LICENSE
locale/             显示名与简介（中文 / English）
icon.svg            插件图标
cordis.patch.yml    挂载声明
test/smoke.mjs      自测
```

---

## 开发

```bash
npm i -D qrcode react react-dom   # 仅测试用
npm test
```

`npm test` 覆盖：PNG / JPEG / 反色 / 小码 / 超大图降采样 / 非法文件、工具调用（含报错路径）、设置页服务端渲染与中英文案。

改完代码后：重新 `install_bundle`（或重启 DSH）让宿主加载新代码，刷新页面让前端 bundle 重新加载。

---

## English

A QR code reader for DeepSeek Harness (dsh). Drop, pick or paste an image in **Settings → QR code reader** and get the link; or let the agent call `read_qr_code` with a local PNG/JPEG path.

- Decoding runs locally, nothing is uploaded.
- No runtime dependencies: `jsQR`, `pngjs` and `jpeg-js` are vendored under `vendor/`.
- Web UI accepts anything the browser can decode; the agent tool takes PNG/JPEG.
- One QR code is reported per image (the first one found).

Install from the plugin market, or clone the repo and let the agent install the folder as a bundle (`plugin_manager` → `install_bundle`), then refresh the page.

MIT licensed.

---

## License

[MIT](LICENSE)
