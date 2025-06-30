const XiaoAi = require('./src/index.js')
const { getProcessedNews, generateNewsSummary } = require('./news_api.js')

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

async function callDeepSeekAPI(prompt) {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 1
      })
    })

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('调用DeepSeek API时出错:', error.message)
    throw error
  }
}

// 预处理：去除中国国家领导人姓名相关句子
function removeLeaderSentences(content) {
  // 领导人姓名列表
  const leaders = [
    '习近平', '李强', '王沪宁', '蔡奇', '丁薛祥', '李希', '韩正', '赵乐际', '王岐山',
    '胡锦涛', '江泽民', '朱镕基', '李鹏', '温家宝', '李瑞环', '吴邦国', '贾庆林', '曾庆红',
    '胡耀邦', '华国锋', '邓小平', '陈云', '叶剑英', '李先念', '宋庆龄', '林彪', '周恩来', '毛泽东'
  ]
  // 构造正则，匹配包含领导人姓名的整句
  const pattern = new RegExp(`[^。！？]*(${leaders.join('|')})[^。！？]*[。！？]`, 'g')
  // 替换为模糊表达
  return content.replace(pattern, '相关情况正在持续发展。')
}

// 二次处理：适度无害化，仅规避中国国家领导人名字与中国敏感词
async function sanitizeContent(content) {
  try {
    // 先去除领导人相关句子
    content = removeLeaderSentences(content)
    console.log('已去除领导人相关句子')
    
    const sanitizePrompt = `你是一位专业的文本优化助手，专门为小爱同学等语音设备优化播报内容。

请仅对以下内容进行适度无害化处理：
- 只需规避中国常见敏感词（如六四、法轮功、台独、疆独、藏独、港独、敏感政治事件等）。
- 对于涉及这些内容的句子，请用"相关情况正在持续发展"或"各方正在积极沟通"等模糊表达替代。
- 其他内容无需改写，保持原文风格和结构。
- 适合家庭环境下的语音播报。

请直接返回处理后的内容，不要添加任何说明文字：

${content}`

    const sanitizedContent = await callDeepSeekAPI(sanitizePrompt)
    console.log('适度无害化处理完成')
    
    return sanitizedContent
  } catch (error) {
    console.error('适度无害化处理失败:', error.message)
    // 如果处理失败，返回原内容
    return content
  }
}

async function getNewsBroadcast() {
  try {
    console.log('正在获取今日新闻...')
    
    // 获取真实新闻数据
    const newsList = await getProcessedNews()
    
    if (newsList.length === 0) {
      return '由于网络连接问题，暂时无法获取最新新闻信息。愿你在纷繁世界中，听见秩序的声音，看见语言与知识的光芒。'
    }
    
    // 生成新闻摘要
    const newsSummary = generateNewsSummary(newsList)
    console.log('新闻摘要:', newsSummary)
    
    // 构建DeepSeek提示词
    const prompt = `你是一位具备新闻分析、旅游推荐、科研汇总能力的智能播报助手。你的任务是基于提供的新闻数据，生成一段完整自然、适合语音播报的全球信息摘要。

【新闻数据】
${newsSummary}

【任务要求】
请从上述新闻中精选20条最重要的新闻，并整合其他信息模块，生成一段完整的播报稿。

【结构说明】请将以下所有模块内容整合为一个段落输出，风格连贯，有逻辑、有节奏、无编号、可自然朗读，不中断。

【语言与表达要求】：
- 每条新闻必须包含**具体国家名称**、**事件时间（哪天/近日/本周/上周）**、**主体之间的互动关系（哪国对哪国、与谁会谈等）**
- 避免使用"死亡""爆炸"等敏感词汇；改用"人道局势恶化""局部局势紧张""突发公共危机"等委婉表述
- 不使用"今天""刚刚"这类即时词汇，以适应长期使用
- 每条内容中如有引用新闻，请注明来源（如：新华社、路透社、彭博社、CNN、科技日报、Nature）

---

【模块一：全球重大新闻】
- 从提供的新闻数据中精选20条最重要的国际与中国新闻
- 类型包括战争外交、能源经济、国家领导人动态、中国政府及科技企业重大决策或发布
- 每条必须包含参与国家、核心事件、时间点

【模块二：油价与能源】
- 简述布伦特原油、WTI走势及背后政策因素
- 可涵盖天然气、光伏、核能、储能等相关能源动态

【模块三：全球股市】
- 简述美股三大指数（纳斯达克、标普500、道指）和中国A股的走势
- 涉及主要板块表现（科技、能源、消费等）

【模块四：中日航班情况】
- 查询当前中国与日本之间航线运行情况、是否有增减、是否因政策变化影响

【模块五：日本生活旅游板块】
- 提供未来1~3个月内，日本主要节庆活动、花期、花火大会信息
- 尤其聚焦关西（大阪、京都、奈良）地区
- 每条包括活动名称、地点、时间、交通建议

【模块六：大阪当日天气】
- 播报当天大阪天气、气温、紫外线强度、空气质量、适合活动等

【模块七：杭州本地新闻模块】
- 简要介绍杭州本地的政策、基建、科技、生活变化，优先播报市政府发布或企业动态

【模块八：旅游景点推荐】
- 每天推荐一个具体旅游景点（中日不限）
- 包含地点、推荐时间段、交通方式、适合人群、特色亮点

【模块九：AI科研模块】
- 精选全球范围内最新AI研究进展（如CVPR、ICML、NeurIPS等会议论文）
- 包括大模型、机器人智能、视觉语言多模态、智能体系统、压缩推理、计算优化等方向
- 使用专业表达，适合博士阶段科研听众，不需简化专业术语

---

【收尾要求】：
请在结尾加入一句温和的收尾语，用诗意但平实的语言收束整体内容，例如：
"时代奔涌，技术与城市并进，愿你在变化中心有所定，在信息中看见世界的光。"

---

【输出格式要求】：
- 整体输出为**一个自然段**
- 不编号、不列清单、不换行
- 使用自然语言连接所有模块内容，确保逻辑顺畅、语义通顺
- 总长度建议在1500字左右，如信息多可略放宽，只要语音设备可完整播报

请根据以上要求生成一次完整的播报内容。`;

    const newsContent = await callDeepSeekAPI(prompt)
    console.log('获取到的播报内容:')
    console.log(newsContent)
    
    return newsContent
  } catch (error) {
    console.error('获取新闻失败:', error.message)
    // 返回一个默认的播报稿
    return '由于网络连接问题，暂时无法获取最新新闻信息。时代奔涌，技术与城市并进，愿你在变化中心有所定，在信息中看见世界的光。'
  }
}

// 智能播放文本 - 只做一次性播放
async function playSmartText(client, text) {
  console.log('直接尝试一次性播放全部内容...')
  try {
    const result = await client.say(text)
    console.log('一次性播放完成！')
    console.log('响应结果:', result)
  } catch (error) {
    console.error('一次性播放失败:', error.message)
  }
}

async function broadcastNews() {
  try {
    console.log('正在连接小爱音箱...')
    
    // 创建小爱音箱客户端实例
    const client = new XiaoAi(process.env.XIAOMI_ACCOUNT, process.env.XIAOMI_PASSWORD)
    
    // 等待连接建立
    await client.connect()
    console.log('连接成功！')
    
    // 获取设备列表，找到小爱音箱Pro
    const devices = await client.getDevice()
    console.log('在线设备:', devices.map(d => d.name))
    
    // 查找小爱音箱Pro设备
    const proDevice = devices.find(device => device.name.includes('Pro') || device.name.includes('pro'))
    
    if (proDevice) {
      // 切换到小爱音箱Pro
      await client.useDevice(proDevice.deviceID)
      console.log(`已切换到设备: ${proDevice.name}`)
    } else {
      console.log('未找到小爱音箱Pro，使用默认设备')
    }
    
    // 获取新闻播报稿
    const newsBroadcast = await getNewsBroadcast()
    
    // 智能播放文本
    await playSmartText(client, newsBroadcast)
    
  } catch (error) {
    console.error('发生错误:', error.message)
    if (error.code) {
      console.error('错误代码:', error.code)
    }
  }
}

// 执行新闻播报
broadcastNews() 