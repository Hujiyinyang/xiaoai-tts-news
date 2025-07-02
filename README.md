# 小爱同学新闻播报与AI简讯自动化系统 | XiaoAi News & AI Briefing Automation System

## 项目简介 | Project Introduction

本项目基于小爱音箱，实现自动获取新闻与AI前沿论文摘要，并通过小爱音箱进行自然语音播报。支持内容智能分段、敏感信息规避、角色人设自定义（如原神霄宫风格），适合家庭、学习、科技爱好者等多场景使用。

This project enables Xiaomi XiaoAi Speaker to automatically fetch and broadcast daily news and AI research summaries with natural speech. It supports smart text segmentation, sensitive information filtering, and customizable persona (e.g., Genshin Impact's XIAOGONG style). Suitable for home, study, and tech enthusiasts.

---

## 需要替换成自己的内容 | What You Need to Customize

1. **小米账号与密码**：请将 `XIAOMI_ACCOUNT` 和 `XIAOMI_PASSWORD` 替换为你自己的小米账号和密码。
2. **DeepSeek API Key**：请在环境变量 `DEEPSEEK_API_KEY` 中填写你自己的 DeepSeek 大模型 API Key。
3. **新闻API**：你可以自定义新闻数据源，推荐使用 [阿里云新闻API](https://market.aliyun.com/apimarket/detail/cmapi011178)。在 `news_api.js` 中配置自己的API Key和接口地址。

1. **Xiaomi Account & Password**: Replace `XIAOMI_ACCOUNT` and `XIAOMI_PASSWORD` with your own Xiaomi account and password.
2. **DeepSeek API Key**: Set your own DeepSeek API Key in the `DEEPSEEK_API_KEY` environment variable.
3. **News API**: You can customize the news data source. Recommended: [Aliyun News API](https://market.aliyun.com/apimarket/detail/cmapi011178). Configure your API key and endpoint in `news_api.js`.

---

## 主要特点 | Key Features

- **自动获取新闻与AI论文摘要**：集成主流新闻API与arXiv论文API，自动整理每日要闻与AI前沿。
- **敏感内容规避**：自动过滤中国敏感词、领导人相关内容，适合家庭环境。
- **DeepSeek大模型智能润色**：调用DeepSeek API生成自然、口语化、带人设风格的播报稿。
- **本地智能分段**：按句号（。）自动分段，提升语音播报体验。
- **角色人设自定义**：可在代码中自定义DeepSeek的角色设定（如原神霄宫、女侠舍友等）。
- **参数灵活可调**：支持自定义账号、API Key、分段逻辑、播报等待时长等。

- **Auto-fetch news & AI research**: Integrates mainstream news APIs and arXiv for daily highlights.
- **Sensitive content filtering**: Automatically removes Chinese sensitive words and leader-related content.
- **DeepSeek LLM enhancement**: Uses DeepSeek API for natural, persona-driven news scripts.
- **Local smart segmentation**: Segments by Chinese period (。) for better TTS experience.
- **Persona customization**: Easily set DeepSeek persona (e.g., Genshin Xiaogong, martial arts roommate).
- **Flexible parameters**: Customizable account, API key, segmentation, and wait time.

---

## 用到的API | APIs Used

- 小米小爱音箱 API（xiaoai-tts）
- DeepSeek 大模型 API（https://api.deepseek.com/v1/chat/completions）
- 新闻聚合API（如news_api.js中自定义，推荐 [阿里云新闻API](https://market.aliyun.com/apimarket/detail/cmapi011178)）
- arXiv 论文API（arxiv_api.js）

- Xiaomi XiaoAi Speaker API (xiaoai-tts)
- DeepSeek LLM API (https://api.deepseek.com/v1/chat/completions)
- News aggregation API (custom in news_api.js, recommend [Aliyun News API](https://market.aliyun.com/apimarket/detail/cmapi011178))
- arXiv research API (arxiv_api.js)

---

## 快速开始 | Quick Start

1. 克隆项目并安装依赖 | Clone & Install

```bash
git clone https://github.com/Hujiyinyang/xiaoai-tts-news.git
cd xiaoai-tts-news
npm install
```

2. 配置环境变量 | Set Environment Variables

```bash
export XIAOMI_ACCOUNT=你的账号
export XIAOMI_PASSWORD=你的密码
export DEEPSEEK_API_KEY=你的DeepSeek Key
```

3. 运行主程序 | Run Main Script

```bash
node news_broadcast.js
```

---

## 定时自动播报的方法 | How to Schedule Auto-Broadcast

你可以使用 `crontab` 或 Windows 任务计划等方式定时运行 `news_broadcast.js`，实现自动新闻播报。

- **Linux/Mac 示例**：

```bash
crontab -e
# 每天早上8点自动播报
0 8 * * * cd /你的项目路径/xiaoai-tts-news && /usr/local/bin/node news_broadcast.js
```

- **Windows 示例**：
  使用"任务计划程序"添加定时任务，执行 `node news_broadcast.js`。

You can use `crontab` (Linux/Mac) or Task Scheduler (Windows) to run `news_broadcast.js` at regular intervals for auto-broadcast.

---

## 如何自定义DeepSeek人设 | How to Customize DeepSeek Persona

在 `news_broadcast.js` 文件中，找到如下 prompt 片段：

```js
const prompt = `你是原神里的霄宫，同时也是我的关系很好的女侠舍友，我是你的同门平辈师姐。...`
```

你可以将"你是原神里的霄宫..."这句话替换为你想要的任何角色设定。例如：

- 你是原神里的甘雨...
- 你是一个科技新闻主播...
- 你是我的AI助手...

保存后重新运行即可生效。

In `news_broadcast.js`, locate the prompt string above. You can freely change the persona description to any style you like (e.g., Ganyu from Genshin, tech news anchor, etc.), then rerun the script.

---

## 参数说明 | Parameters

- `XIAOMI_ACCOUNT`：小米账号（必填）
- `XIAOMI_PASSWORD`：小米密码（必填）
- `DEEPSEEK_API_KEY`：DeepSeek大模型API Key（必填）
- `news_api.js`、`arxiv_api.js`：可自定义新闻与论文数据源
- 播报等待时长：每6个字等待1秒，可在 `playSmartText` 函数中调整
- 分段逻辑：按"。"分段，可在 `playSmartText` 函数中自定义

- `XIAOMI_ACCOUNT`: Xiaomi account (required)
- `XIAOMI_PASSWORD`: Xiaomi password (required)
- `DEEPSEEK_API_KEY`: DeepSeek API key (required)
- `news_api.js`, `arxiv_api.js`: Customizable news & paper sources
- Wait time: 1s per 6 chars, adjustable in `playSmartText`
- Segmentation: by '.', customizable in `playSmartText`

---

## 贡献与反馈 | Contribution & Feedback

欢迎提交PR、Issue或建议！

PRs, issues, and suggestions are welcome!

---

## 鸣谢 | Acknowledgements

- 感谢 [MIGPT](https://github.com/shaonianzhentan/migpt) 及所有开源小爱同学相关项目的启发与技术支持。
- Thanks to [MIGPT](https://github.com/shaonianzhentan/migpt) and all open-source XiaoAi-related projects for inspiration and technical support.

---

## License

MIT
