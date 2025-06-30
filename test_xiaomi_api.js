const https = require('https');

const XiaoAi = require('./src/index.js');

// 小爱音箱API测试程序
class XiaomiAPITester {
  constructor() {
    this.client = null;
    this.testResults = [];
  }

  // 初始化连接
  async initialize() {
    try {
      console.log('正在连接小爱音箱...');
      this.client = new XiaoAi(process.env.XIAOMI_ACCOUNT, process.env.XIAOMI_PASSWORD);
      await this.client.connect();
      console.log('连接成功！');
      
      // 获取设备列表
      const devices = await this.client.getDevice();
      console.log('在线设备:', devices.map(d => d.name));
      
      // 查找小爱音箱Pro设备
      const proDevice = devices.find(device => device.name.includes('Pro') || device.name.includes('pro'));
      
      if (proDevice) {
        await this.client.useDevice(proDevice.deviceID);
        console.log(`已切换到设备: ${proDevice.name}`);
      } else if (devices.length > 0) {
        await this.client.useDevice(devices[0].deviceID);
        console.log(`使用默认设备: ${devices[0].name}`);
      } else {
        throw new Error('未找到可用设备');
      }
      
      return true;
    } catch (error) {
      console.error('初始化失败:', error.message);
      return false;
    }
  }

  // 测试播报功能
  async testBroadcast(text, testName) {
    return new Promise(async (resolve) => {
      const startTime = Date.now();
      let success = false;
      let error = null;
      
      try {
        console.log(`\n=== 测试: ${testName} ===`);
        console.log(`文本长度: ${text.length} 字符`);
        console.log(`文本内容: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        
        await this.client.say(text);
        success = true;
        console.log('✅ 播报成功');
        
      } catch (err) {
        error = err;
        console.log('❌ 播报失败:', err.message);
        if (err.code) {
          console.log('错误代码:', err.code);
        }
        if (err.data) {
          console.log('错误数据:', JSON.stringify(err.data, null, 2));
        }
      }
      
      const duration = Date.now() - startTime;
      
      const result = {
        testName,
        textLength: text.length,
        text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        success,
        error: error ? error.message : null,
        errorCode: error ? error.code : null,
        duration,
        timestamp: new Date().toISOString()
      };
      
      this.testResults.push(result);
      resolve(result);
    });
  }

  // 生成不同长度的测试文本
  generateTestTexts() {
    const baseText = '这是一个测试文本，用于验证小爱音箱的播报功能。';
    
    return [
      {
        name: '超短文本测试',
        text: '测试'
      },
      {
        name: '短文本测试',
        text: '你好，小爱同学'
      },
      {
        name: '中等文本测试',
        text: '今天天气很好，适合出门散步。'
      },
      {
        name: '较长文本测试',
        text: '人工智能技术正在快速发展，为我们的生活带来了很多便利。从语音助手到自动驾驶，AI的应用越来越广泛。'
      },
      {
        name: '长文本测试',
        text: '随着科技的不断进步，人工智能已经渗透到我们生活的方方面面。从智能手机的语音助手，到智能家居的自动化控制，再到医疗诊断和金融分析，AI技术正在改变着我们的工作方式和生活方式。这些技术的应用不仅提高了效率，也为解决复杂问题提供了新的思路。'
      },
      {
        name: '超长文本测试',
        text: '在当今快速发展的科技时代，人工智能技术已经成为了推动社会进步的重要力量。从日常生活中的智能手机语音助手，到工业领域的自动化生产线，再到医疗健康领域的智能诊断系统，AI技术的应用范围越来越广泛。这些技术的出现不仅极大地提高了工作效率，也为解决人类面临的复杂挑战提供了新的可能性。同时，我们也需要关注AI技术发展过程中可能带来的伦理和安全问题，确保技术的健康发展。'
      }
    ];
  }

  // 生成包含敏感词的测试文本
  generateSensitiveTestTexts() {
    return [
      {
        name: '正常文本测试',
        text: '今天天气很好，适合出门散步。'
      },
      {
        name: '包含政治敏感词测试',
        text: '今天天气很好，适合出门散步。相关情况正在持续发展。'
      },
      {
        name: '包含暴力词汇测试',
        text: '今天天气很好，适合出门散步。局部局势紧张。'
      },
      {
        name: '包含宗教词汇测试',
        text: '今天天气很好，适合出门散步。各方正在积极沟通。'
      },
      {
        name: '包含数字敏感词测试',
        text: '今天天气很好，适合出门散步。相关事件正在处理中。'
      },
      {
        name: '包含地名敏感词测试',
        text: '今天天气很好，适合出门散步。相关地区情况稳定。'
      }
    ];
  }

  // 生成特殊字符测试文本
  generateSpecialCharTestTexts() {
    return [
      {
        name: '包含英文测试',
        text: 'Hello, 小爱同学，今天天气很好。'
      },
      {
        name: '包含数字测试',
        text: '今天是2025年6月30日，天气很好。'
      },
      {
        name: '包含标点符号测试',
        text: '今天天气很好！适合出门散步。'
      },
      {
        name: '包含特殊符号测试',
        text: '今天天气很好，适合出门散步（天气晴朗）。'
      },
      {
        name: '包含换行符测试',
        text: '今天天气很好\n适合出门散步'
      },
      {
        name: '包含空格测试',
        text: '今天    天气    很好，适合出门散步。'
      }
    ];
  }

  // 运行长度测试
  async runLengthTests() {
    console.log('\n' + '='.repeat(60));
    console.log('开始长度测试');
    console.log('='.repeat(60));
    
    const testTexts = this.generateTestTexts();
    
    for (const test of testTexts) {
      await this.testBroadcast(test.text, test.name);
      // 等待5秒再进行下一个测试
      console.log('等待5秒...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // 运行敏感词测试
  async runSensitiveTests() {
    console.log('\n' + '='.repeat(60));
    console.log('开始敏感词测试');
    console.log('='.repeat(60));
    
    const testTexts = this.generateSensitiveTestTexts();
    
    for (const test of testTexts) {
      await this.testBroadcast(test.text, test.name);
      // 等待8秒再进行下一个测试
      console.log('等待8秒...');
      await new Promise(resolve => setTimeout(resolve, 8000));
    }
  }

  // 运行特殊字符测试
  async runSpecialCharTests() {
    console.log('\n' + '='.repeat(60));
    console.log('开始特殊字符测试');
    console.log('='.repeat(60));
    
    const testTexts = this.generateSpecialCharTestTexts();
    
    for (const test of testTexts) {
      await this.testBroadcast(test.text, test.name);
      // 等待6秒再进行下一个测试
      console.log('等待6秒...');
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }

  // 运行实际新闻内容测试
  async runNewsContentTests() {
    console.log('\n' + '='.repeat(60));
    console.log('开始实际新闻内容测试');
    console.log('='.repeat(60));
    
    const newsTests = [
      {
        name: '简短新闻测试',
        text: '国家统计局数据显示，我国经济持续向好发展。'
      },
      {
        name: '中等新闻测试',
        text: '国家统计局数据显示，我国6月制造业PMI回升至扩张区间，经济景气水平总体保持稳定。'
      },
      {
        name: '较长新闻测试',
        text: '国家统计局数据显示，我国6月制造业PMI回升至扩张区间，经济景气水平总体保持稳定。中老铁路跨境运输上半年创历史新高，新疆吉木萨尔页岩油日产量首破5000吨。'
      },
      {
        name: '完整新闻测试',
        text: '今日要闻：国家统计局数据显示，我国6月制造业PMI回升至扩张区间，经济景气水平总体保持稳定。中老铁路跨境运输上半年创历史新高，新疆吉木萨尔页岩油日产量首破5000吨。重庆东站正式开通运营，成为西部最大高铁枢纽。'
      }
    ];
    
    for (const test of newsTests) {
      await this.testBroadcast(test.text, test.name);
      // 等待10秒再进行下一个测试
      console.log('等待10秒...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // 生成测试报告
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('测试报告');
    console.log('='.repeat(60));
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    
    console.log(`总测试数: ${totalTests}`);
    console.log(`成功数: ${successfulTests}`);
    console.log(`失败数: ${failedTests}`);
    console.log(`成功率: ${((successfulTests / totalTests) * 100).toFixed(2)}%`);
    
    console.log('\n详细结果:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.testName} (${result.textLength}字符) - ${result.success ? '成功' : result.error}`);
    });
    
    // 分析失败原因
    const failures = this.testResults.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('\n失败分析:');
      const errorTypes = {};
      failures.forEach(failure => {
        const errorType = failure.error || '未知错误';
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      });
      
      Object.entries(errorTypes).forEach(([error, count]) => {
        console.log(`- ${error}: ${count}次`);
      });
    }
    
    // 分析长度与成功率的关系
    console.log('\n长度与成功率分析:');
    const lengthGroups = {};
    this.testResults.forEach(result => {
      const lengthGroup = result.textLength <= 20 ? '超短(≤20)' :
                         result.textLength <= 50 ? '短(21-50)' :
                         result.textLength <= 100 ? '中等(51-100)' :
                         result.textLength <= 200 ? '长(101-200)' : '超长(>200)';
      
      if (!lengthGroups[lengthGroup]) {
        lengthGroups[lengthGroup] = { total: 0, success: 0 };
      }
      lengthGroups[lengthGroup].total++;
      if (result.success) {
        lengthGroups[lengthGroup].success++;
      }
    });
    
    Object.entries(lengthGroups).forEach(([group, stats]) => {
      const successRate = ((stats.success / stats.total) * 100).toFixed(2);
      console.log(`- ${group}: ${stats.success}/${stats.total} (${successRate}%)`);
    });
  }

  // 运行所有测试
  async runAllTests() {
    console.log('开始小爱音箱API全面测试...\n');
    
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('初始化失败，无法进行测试');
      return;
    }
    
    try {
      await this.runLengthTests();
      await this.runSensitiveTests();
      await this.runSpecialCharTests();
      await this.runNewsContentTests();
      
      this.generateReport();
      
    } catch (error) {
      console.error('测试过程中发生错误:', error.message);
    } finally {
      console.log('\n测试完成');
    }
  }
}

// 运行测试
async function main() {
  const tester = new XiaomiAPITester();
  
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

module.exports = XiaomiAPITester; 