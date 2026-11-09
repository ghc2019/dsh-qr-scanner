# 发布说明（GitHub + DSH 插件市场）

这份文件记录发布流程，方便以后更新版本时照做。仓库里的实际步骤见 [README](README.md)。

---

## 0. 发布前自检

```bash
npm test
```

另外确认这几件事（都是市场会检查的硬性条件）：

- `package.json` 里有 `dsh.bundle.patch`，并且根目录存在 `cordis.patch.yml`；
- `dsh.client` 只用来声明前端，**不能**只有 `dsh.client` 而没有 `dsh.bundle`；
- `files` 覆盖运行时需要的全部文件（`index.js`、`client.js`、`lib/`、`vendor/`、`locale/`、`icon.svg`、`cordis.patch.yml`）；
- `icon.svg` 与 `assets/icon-180.png` 都在仓库里（市场列表用 PNG，插件内部用 SVG）；
- README 与实现一致——市场维护者会对着代码读描述。

---

## 1. 建仓库并推送

```bash
cd C:\Users\郭汉超\Documents\deepseek-harness\default-workspace\dsh-qr-scanner
git init -b main
git add .
git commit -m "feat: QR code reader plugin for DeepSeek Harness"
git remote add origin https://github.com/ghc2019/dsh-qr-scanner.git
git push -u origin main
```

第一次 `push` 会弹 Git Credential Manager 登录 GitHub（或者用 Personal Access Token 当密码）。

如果仓库还没建：GitHub → **New repository** → 名字 `dsh-qr-scanner` → **Public** → 不要勾 README / .gitignore / license（本地已有）→ Create。

---

## 2. 仓库设置

- **About → Description**：`Read QR codes from images and get the link — a DeepSeek Harness plugin.`
- **Topics**：`dsh-plugin`、`deepseek-harness`、`qrcode`、`qr-code`、`scanner`（`dsh-plugin` 是市场发现插件的约定 topic）
- 可选：打 tag `v1.0.0` 并发一个 Release。

---

## 3. 提交到插件市场

市场是 GitHub 上的一个数据仓库：`awesome-dsh-plugin/awesome-dsh-plugin`。每个插件就是一个 YAML 文件，README 和索引都由 CI 生成，不要手改。

1. Fork `awesome-dsh-plugin/awesome-dsh-plugin`。
2. 新建文件 `data/plugins/ghc2019__dsh-qr-scanner.yml`：

```yaml
url: https://github.com/ghc2019/dsh-qr-scanner
name: ghc2019/dsh-qr-scanner
category: tools
description:
  en: Read QR codes from images and open the link they hold.
  zh: 识别图片里的二维码，取出其中的链接。
icon: https://raw.githubusercontent.com/ghc2019/dsh-qr-scanner/main/assets/icon-180.png
```

3. 提交并开 PR，标题例如 `Add ghc2019/dsh-qr-scanner`。

规则要点：

- `description.en` 必填、一句话、以句号结尾；描述必须和代码做的事一致；行内出现 `: ` 要加引号；
- `category` 从这些里选：`agi ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun`；选偏了维护者会改，不算拒绝；
- 仓库要有一天以上历史（CI 会看创建时间），代码要真的能跑；
- 一次 PR 最多 3 个插件；
- `icon` 必须是 **PNG/JPG/WEBP**（SVG 不行），建议 96–180px 正方形、GitHub 可直连；不填就用 owner 头像；
- 如果以后发到 npm，npm 里的 `repository` 字段要指回这个仓库（本仓库已配好，不需要在 yml 里写 npm 字段）。

---

## 4. 审核与上线

- PR 先跑 CI：校验 YAML、检查仓库存在/年龄、检查 `dsh.bundle` 声明。CI 绿了才进入人工 review。
- 维护者会读仓库。问题会以 PR 评论的形式回来；被打上 `held: author` 只是暂停，不是拒绝。
- 合并后索引（`https://awesome-dsh-plugin.com/index.json`）更新，市场里就能搜到。

---

## 5. 以后发 npm（可选）

```bash
npm login
npm publish --access public
```

包名 `dsh-qr-scanner` 是无 scope 的，可以直接发。`files` 已经排除了 `test/`、`node_modules/`。

---

## 6. 发新版本

1. 改代码，`npm test`。
2. `package.json` 里 `version` 递增（语义化版本）。
3. `git add -A && git commit -m "release: v1.0.1" && git tag v1.0.1 && git push --follow-tags`。
4. 市场按 tag/版本重新抓取；npm 需要再 `npm publish`。
5. 如果改的是安装方式或依赖，记得同步更新 README 和这份文件。
