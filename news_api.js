const https = require('https');

// 极速数据API配置
const API_CONFIG = {
  host: 'jisunews.market.alicloudapi.com',
  path: '/news/get',
  appCode: '6a7a98ab69b4412aa2949f1bcee97a2b'
};

// 敏感词列表（本地过滤）
const SENSITIVE_WORDS = [
  '死亡', '袭击', '爆炸', '恐怖', '暴力', '冲突', '战争', '军事', '武器',
  '六四', '法轮功', '台独', '疆独', '藏独', '港独', '敏感政治事件',
  '习近平', '李强', '王沪宁', '蔡奇', '丁薛祥', '李希', '韩正', '赵乐际', '王岐山'
];

// 获取新闻数据
async function fetchNews(channel, num = 20) {
  return new Promise((resolve, reject) => {
    const querys = `channel=${encodeURIComponent(channel)}&num=${num}&start=0`;
    const url = `https://${API_CONFIG.host}${API_CONFIG.path}?${querys}`;
    
    const options = {
      hostname: API_CONFIG.host,
      path: `${API_CONFIG.path}?${querys}`,
      method: 'GET',
      headers: {
        'Authorization': `APPCODE ${API_CONFIG.appCode}`,
        'Content-Type': 'application/json; charset=UTF-8'
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
          if (result.status === 0) {
            resolve(result.result);
          } else {
            reject(new Error(`API返回错误: ${result.msg}`));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`请求失败: ${error.message}`));
    });

    req.end();
  });
}

// 本地敏感词过滤
function filterSensitiveContent(content) {
  let filteredContent = content;
  
  // 过滤敏感词
  SENSITIVE_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filteredContent = filteredContent.replace(regex, '***');
  });
  
  // 过滤HTML标签
  filteredContent = filteredContent.replace(/<[^>]*>/g, '');
  
  // 过滤多余空白字符
  filteredContent = filteredContent.replace(/\s+/g, ' ').trim();
  
  return filteredContent;
}

// 提取新闻关键信息
function extractNewsInfo(newsList) {
  return newsList.map(news => ({
    title: filterSensitiveContent(news.title),
    time: news.time,
    source: news.src,
    category: news.category,
    content: filterSensitiveContent(news.content).substring(0, 200) + '...' // 截取前200字符
  }));
}

// 获取并处理新闻数据
async function getProcessedNews() {
  try {
    console.log('正在获取国内新闻...');
    const domesticNews = await fetchNews('国内', 20);
    
    console.log('正在获取国际新闻...');
    const internationalNews = await fetchNews('国际', 20);
    
    // 合并新闻列表
    const allNews = [
      ...extractNewsInfo(domesticNews.list || []),
      ...extractNewsInfo(internationalNews.list || [])
    ];
    
    console.log(`成功获取 ${allNews.length} 条新闻`);
    
    return allNews;
  } catch (error) {
    console.error('获取新闻失败:', error.message);
    return [];
  }
}

// 生成新闻摘要文本
function generateNewsSummary(newsList) {
  if (newsList.length === 0) {
    return '暂无最新新闻信息。';
  }
  
  let summary = '以下是今日重要新闻摘要：';
  
  newsList.forEach((news, index) => {
    summary += ` ${index + 1}、${news.title}（来源：${news.source}，时间：${news.time}）。`;
  });
  
  return summary;
}

module.exports = {
  getProcessedNews,
  generateNewsSummary,
  filterSensitiveContent
}; 