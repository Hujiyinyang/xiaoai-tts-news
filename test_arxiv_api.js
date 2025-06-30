const https = require('https');

// arXiv API测试程序
class ArxivAPITester {
  constructor() {
    this.baseUrl = 'https://export.arxiv.org/api/query';
  }

  // 构建API请求URL
  buildQueryUrl(params) {
    const queryParams = new URLSearchParams(params);
    return `${this.baseUrl}?${queryParams.toString()}`;
  }

  // 发送API请求
  async makeRequest(params) {
    return new Promise((resolve, reject) => {
      const url = this.buildQueryUrl(params);
      console.log(`\n=== 发送请求 ===`);
      console.log(`URL: ${url}`);
      
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ArxivTester/1.0)'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`\n=== 响应状态 ===`);
          console.log(`状态码: ${res.statusCode}`);
          console.log(`响应头:`, res.headers);
          
          if (res.statusCode === 200) {
            try {
              const result = this.parseResponse(data);
              resolve(result);
            } catch (error) {
              reject(new Error(`解析响应失败: ${error.message}`));
            }
          } else {
            reject(new Error(`HTTP错误: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });

      req.end();
    });
  }

  // 解析XML响应
  parseResponse(xmlData) {
    console.log(`\n=== 原始响应数据 ===`);
    console.log(`数据长度: ${xmlData.length} 字符`);
    console.log(`前500字符:`, xmlData.substring(0, 500));
    
    const papers = [];
    
    // 提取总结果数
    const totalResultsMatch = xmlData.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);
    const totalResults = totalResultsMatch ? parseInt(totalResultsMatch[1]) : 0;
    
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
    
    return {
      totalResults: totalResults,
      papers: papers,
      rawData: xmlData
    };
  }

  // 测试不同的搜索查询
  async testSearchQueries() {
    console.log('=== arXiv API 搜索测试 ===\n');
    
    const testQueries = [
      {
        name: '基础具身智能搜索',
        params: {
          search_query: 'ti:"embodied intelligence"',
          max_results: 5,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      },
      {
        name: '扩展具身智能搜索',
        params: {
          search_query: 'ti:"embodied intelligence" OR ti:"embodied AI" OR ti:"embodied agent"',
          max_results: 10,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      },
      {
        name: '全字段具身智能搜索',
        params: {
          search_query: 'all:"embodied intelligence"',
          max_results: 5,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      },
      {
        name: '机器人相关搜索',
        params: {
          search_query: 'ti:"embodied robot" OR ti:"robot learning"',
          max_results: 5,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      },
      {
        name: '大模型搜索',
        params: {
          search_query: 'ti:"large language model" OR ti:"LLM"',
          max_results: 5,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      },
      {
        name: '通用AI搜索',
        params: {
          search_query: 'ti:"artificial intelligence"',
          max_results: 5,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      },
      {
        name: '无限制搜索（测试API连接）',
        params: {
          search_query: 'all:electron',
          max_results: 3,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      }
    ];

    for (const test of testQueries) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`测试: ${test.name}`);
      console.log(`${'='.repeat(50)}`);
      
      try {
        const result = await this.makeRequest(test.params);
        
        console.log(`\n=== 搜索结果 ===`);
        console.log(`总结果数: ${result.totalResults}`);
        console.log(`返回论文数: ${result.papers.length}`);
        
        if (result.papers.length > 0) {
          console.log(`\n=== 论文详情 ===`);
          result.papers.forEach((paper, index) => {
            console.log(`\n${index + 1}. ${paper.title}`);
            console.log(`   作者: ${paper.authors.slice(0, 3).join(', ')}`);
            console.log(`   发布时间: ${paper.published}`);
            console.log(`   摘要: ${paper.summary.substring(0, 100)}...`);
          });
        } else {
          console.log('未找到相关论文');
        }
        
        // 等待3秒，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`测试失败: ${error.message}`);
      }
    }
  }

  // 测试日期范围搜索
  async testDateRangeSearch() {
    console.log(`\n${'='.repeat(50)}`);
    console.log('测试日期范围搜索');
    console.log(`${'='.repeat(50)}`);
    
    const dateQueries = [
      {
        name: '最近一周',
        params: {
          search_query: 'ti:"embodied intelligence" AND submittedDate:[20250101 TO 20250131]',
          max_results: 10,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      },
      {
        name: '最近一个月',
        params: {
          search_query: 'ti:"embodied intelligence" AND submittedDate:[20241201 TO 20250131]',
          max_results: 10,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      },
      {
        name: '2024年全年',
        params: {
          search_query: 'ti:"embodied intelligence" AND submittedDate:[20240101 TO 20241231]',
          max_results: 10,
          sortBy: 'submittedDate',
          sortOrder: 'descending'
        }
      }
    ];

    for (const test of dateQueries) {
      console.log(`\n测试: ${test.name}`);
      
      try {
        const result = await this.makeRequest(test.params);
        console.log(`总结果数: ${result.totalResults}`);
        console.log(`返回论文数: ${result.papers.length}`);
        
        if (result.papers.length > 0) {
          result.papers.forEach((paper, index) => {
            console.log(`${index + 1}. ${paper.title} (${paper.published})`);
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error(`测试失败: ${error.message}`);
      }
    }
  }

  // 运行所有测试
  async runAllTests() {
    console.log('开始arXiv API全面测试...\n');
    
    await this.testSearchQueries();
    await this.testDateRangeSearch();
    
    console.log(`\n${'='.repeat(50)}`);
    console.log('测试完成');
    console.log(`${'='.repeat(50)}`);
  }
}

// 运行测试
async function main() {
  const tester = new ArxivAPITester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('测试程序执行失败:', error.message);
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  main();
}

module.exports = ArxivAPITester; 