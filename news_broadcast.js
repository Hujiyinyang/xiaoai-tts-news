const https = require('https');

const XiaoAi = require('./src/index.js')
const { getProcessedNews, generateNewsSummary } = require('./news_api.js')
const { getAIResearchPapers, generateArxivSummary, processArxivPapers } = require('./arxiv_api.js')

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

async function callDeepSeekAPI(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 5000,
      temperature: 1,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      system_prompt: "你是一个深度思考的AI助手，请仔细分析用户提供的信息，进行深入思考后给出高质量的回复。同时你是我的关系很好的女侠舍友，我是你的同门平辈师姐。请用自然、口语化的方式播报新闻和AI前沿简讯。
"
    });

    const options = {
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.choices && result.choices[0]) {
            resolve(result.choices[0].message.content);
          } else {
            reject(new Error(`API返回格式错误: ${data}`));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求失败: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
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
      return '由于网络连接问题，暂时无法获取最新新闻信息。时代奔涌，技术与城市并进，愿你在变化中心有所定，在信息中看见世界的光。'
    }
    
    // 获取arXiv论文数据
    const arxivPapers = await getAIResearchPapers()
    
    // 生成新闻摘要
    const newsSummary = generateNewsSummary(newsList)
    
    // 生成arXiv摘要
    const arxivSummary = generateArxivSummary(arxivPapers)
    
    // 打印完整发送给DeepSeek的内容
    console.log('=== 发送给DeepSeek的完整内容 ===')
    console.log('新闻数据:')
    console.log(newsSummary)
    console.log('\narXiv论文数据:')
    console.log(arxivSummary)
    console.log('=== 开始调用DeepSeek进行筛选 ===')
    
    // 构建DeepSeek提示词
    const prompt = `你是一位新闻播报助手。请从以下40条新闻中精选15条最重要的新闻，生成一段简洁的播报稿，然后在新闻播报后生成简短的AI科研前沿简讯。

【新闻数据】
${newsSummary}

【arXiv论文数据】
${arxivSummary}

【要求】
1. 新闻播报：精选15条最重要新闻，生成一段200字以内的自然播报稿
2. AI科研简讯：基于arXiv数据，生成100字以内的AI研究前沿简讯
3. 语言简洁，避免重复，适合语音播报
4. 总字数控制在300字以内

请按以下格式输出：
新闻播报稿：[播报内容]
AI科研前沿简讯：[简讯内容]`;

    const newsContent = await callDeepSeekAPI(prompt)
    console.log('=== DeepSeek筛选结果 ===')
    console.log('获取到的播报内容:')
    console.log(newsContent)
    
    return newsContent
  } catch (error) {
    console.error('获取新闻失败:', error.message)
    // 返回一个默认的播报稿
    return '由于网络连接问题，暂时无法获取最新新闻信息。时代奔涌，技术与城市并进，愿你在变化中心有所定，在信息中看见世界的光。'
  }
}

// 智能播放文本 - 支持分段播报
async function playSmartText(client, text) {
  console.log('=== 开始播报 ===')
  
  // 分段播报内容
  const segments = text.split('AI科研前沿简讯：')
  if (segments.length >= 2) {
    const newsPart = segments[0].replace('新闻播报稿：', '').replace('【新闻播报稿】', '').trim()
    const arxivPart = segments[1].trim()
    
    console.log('=== 分段播报 ===')
    console.log('新闻部分:', newsPart)
    console.log('arXiv部分:', arxivPart)
    
    // 先播报新闻部分
    console.log('正在播报新闻部分...')
    try {
      await client.say(newsPart)
      console.log('新闻播报完成')
      
      // 等待3秒后播报arXiv部分
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      console.log('正在播报arXiv部分...')
      await client.say(arxivPart)
      console.log('arXiv播报完成')
      
    } catch (error) {
      console.error('分段播报失败:', error.message)
      // 如果分段播报失败，尝试一次性播报
      console.log('尝试一次性播报...')
      try {
        await client.say(text)
        console.log('一次性播报成功')
      } catch (finalError) {
        console.error('一次性播放失败:', finalError.message)
      }
    }
  } else {
    // 如果无法分段，直接播报
    console.log('直接尝试一次性播放全部内容...')
    try {
      await client.say(text)
      console.log('一次性播报成功')
    } catch (error) {
      console.error('一次性播放失败:', error.message)
    }
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
    
    // 查找小爱音箱Pro设备，如果找不到就使用第一个设备
    const proDevice = devices.find(device => device.name.includes('Pro') || device.name.includes('pro'))
    
    if (proDevice) {
      // 切换到小爱音箱Pro
      await client.useDevice(proDevice.deviceID)
      console.log(`已切换到设备: ${proDevice.name}`)
    } else if (devices.length > 0) {
      // 使用第一个可用设备
      await client.useDevice(devices[0].deviceID)
      console.log(`使用默认设备: ${devices[0].name}`)
    } else {
      console.log('未找到可用设备，尝试使用默认设备')
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
