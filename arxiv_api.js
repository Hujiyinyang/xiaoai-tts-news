const http = require('http');

// arXiv API配置
const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';

// 获取arXiv论文
async function fetchArxivPapers(query, maxResults = 10, daysBack = 7) {
  return new Promise((resolve, reject) => {
    // 计算一周前的日期
    const today = new Date();
    const weekAgo = new Date(today.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const weekAgoStr = weekAgo.toISOString().split('T')[0].replace(/-/g, '');
    
    const params = new URLSearchParams({
      search_query: query,
      start: 0,
      max_results: maxResults,
      sortBy: 'submittedDate',
      sortOrder: 'descending'
    });
    
    const options = {
      hostname: 'export.arxiv.org',
      port: 80,
      path: `/api/query?${params.toString()}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // 解析XML响应
          const papers = parseArxivXML(data);
          // 过滤最近一周的论文
          const recentPapers = papers.filter(paper => {
            if (!paper.published) return false;
            const paperDate = paper.published.substring(0, 10).replace(/-/g, '');
            return paperDate >= weekAgoStr;
          });
          resolve(recentPapers);
        } catch (error) {
          reject(new Error(`解析arXiv响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`arXiv请求失败: ${error.message}`));
    });

    req.end();
  });
}

// 解析arXiv XML响应
function parseArxivXML(xmlData) {
  const papers = [];
  
  // 简单的XML解析，提取entry标签
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xmlData)) !== null) {
    const entry = match[1];
    
    // 提取标题
    const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/^\s+|\s+$/g, '') : '';
    
    // 提取摘要
    const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    const summary = summaryMatch ? summaryMatch[1].replace(/^\s+|\s+$/g, '') : '';
    
    // 提取作者
    const authorMatches = entry.match(/<name>([^<]+)<\/name>/g);
    const authors = authorMatches ? authorMatches.map(a => a.replace(/<\/?name>/g, '')) : [];
    
    // 提取发布日期
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    const published = publishedMatch ? publishedMatch[1] : '';
    
    // 提取论文ID
    const idMatch = entry.match(/<id>([^<]+)<\/id>/);
    const id = idMatch ? idMatch[1] : '';
    
    if (title && summary) {
      papers.push({
        title: title,
        summary: summary,
        authors: authors,
        published: published,
        id: id
      });
    }
  }
  
  return papers;
}

// 获取具身智能和大模型相关论文
async function getAIResearchPapers() {
  try {
    console.log('正在获取具身智能相关论文...');
    // 搜索一周内的具身智能相关论文
    const embodiedPapers = await fetchArxivPapers('ti:"embodied intelligence" OR ti:"embodied AI" OR ti:"embodied agent" OR ti:"embodied robot" OR ti:"embodied learning" OR ti:"embodied cognition"', 15, 7);
    
    console.log('正在获取大模型相关论文...');
    // 搜索一周内的大模型相关论文
    const llmPapers = await fetchArxivPapers('ti:"large language model" OR ti:"LLM" OR ti:"foundation model" OR ti:"transformer" OR ti:"language model" OR ti:"GPT" OR ti:"BERT"', 15, 7);
    
    const allPapers = [...embodiedPapers, ...llmPapers];
    
    console.log(`成功获取 ${allPapers.length} 篇AI研究论文（最近一周）`);
    
    return allPapers;
  } catch (error) {
    console.error('获取arXiv论文失败:', error.message);
    return [];
  }
}

// 生成论文摘要文本
function generateArxivSummary(papers) {
  if (papers.length === 0) {
    return '暂无最新AI研究论文信息。';
  }
  
  let summary = '以下是arXiv最新AI研究论文摘要：';
  
  papers.forEach((paper, index) => {
    const shortSummary = paper.summary.substring(0, 150) + '...';
    summary += ` ${index + 1}、${paper.title}（作者：${paper.authors.slice(0, 3).join(', ')}，发布时间：${paper.published.substring(0, 10)}）。摘要：${shortSummary}`;
  });
  
  return summary;
}

// 本地处理论文信息
function processArxivPapers(papers) {
  return papers.map(paper => ({
    title: paper.title,
    summary: paper.summary.substring(0, 200) + '...', // 截取前200字符
    authors: paper.authors.slice(0, 3), // 只取前3个作者
    published: paper.published.substring(0, 10), // 只取日期部分
    id: paper.id
  }));
}

module.exports = {
  getAIResearchPapers,
  generateArxivSummary,
  processArxivPapers
}; 