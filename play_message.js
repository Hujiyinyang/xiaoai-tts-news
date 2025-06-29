const XiaoAi = require('./src/index.js')

async function playMessage() {
  try {
    console.log('正在连接小爱音箱...')
    
    // 创建小爱音箱客户端实例
    const client = new XiaoAi('2369761180', 'Yfl140106428036')
    
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
    
    // 播放指定文本
    const message = '你好，今天是2025年6月29日'
    console.log(`正在播放: "${message}"`)
    
    const result = await client.say(message)
    console.log('播放完成！')
    console.log('响应结果:', result)
    
  } catch (error) {
    console.error('发生错误:', error.message)
    if (error.code) {
      console.error('错误代码:', error.code)
    }
  }
}

// 执行播放
playMessage() 