# 打包成 Android APK

本项目用 [Capacitor](https://capacitorjs.com/) 将网页打包成 APK，安装到手机即可使用，无需服务器。

## 环境要求

- **Node.js** 18+（[下载](https://nodejs.org/)）
- **Android Studio**（[下载](https://developer.android.com/studio)），用于生成 APK；或仅安装 Android SDK + 命令行构建

## 步骤

### 1. 安装依赖

在项目根目录（FarmCalc-main）打开终端，执行：

```bash
npm install
```

### 2. 添加 Android 平台

```bash
npx cap add android
```

会生成 `android` 文件夹。

### 3. 把网页资源复制到 Android 工程

```bash
npx cap copy
```

会把 `index.html`、`style.css`、`app.js`、`Plant.json`、`seed-shop-merged-export.json`、`seed_mapping.json` 以及 `seed_images_named`（若有）等复制到 Android 工程里。

### 4. 生成 APK

**方式 A：用 Android Studio（推荐）**

```bash
npx cap open android
```

在 Android Studio 中：

1. 等待 Gradle 同步完成
2. 菜单 **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. 构建完成后点 **locate** 或到目录打开 APK：  
   `android/app/build/outputs/apk/debug/app-debug.apk`

把 `app-debug.apk` 传到手机安装即可。

**方式 B：命令行（已装 Android SDK 时）**

Windows（在项目根目录）：

```bash
cd android
.\gradlew.bat assembleDebug
```

APK 位置：`android\app\build\outputs\apk\debug\app-debug.apk`。

macOS / Linux：

```bash
cd android && ./gradlew assembleDebug
```

APK 在：`android/app/build/outputs/apk/debug/app-debug.apk`。

---

## 修改网页后重新打包

改过 `index.html`、`app.js`、`style.css` 或任意资源后：

1. 再执行一次复制：`npx cap copy`
2. 然后按上面「生成 APK」任选一种方式重新打 APK即可。

---

## 说明

- **debug APK**：可直接安装使用，无需签名即可在真机调试。
- **release APK**：要上架或正式分发时，在 Android Studio 里用 **Build** → **Generate Signed Bundle / APK** 选 APK，配置签名后生成。
- 若项目里有 `seed_images_named` 文件夹，请保证在运行 `npx cap copy` 前该文件夹存在，这样图片会一并打进 APK。
