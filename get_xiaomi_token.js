const fs = require('fs')
const XiaoAi = require('./src/index.js')

async function getAndSaveToken() {
  try {
    console.log('========== 开始获取小米 Token ==========')

    const account = process.env.XIAOMI_ACCOUNT
    const password = process.env.XIAOMI_PASSWORD

    if (!account || !password) {
      throw new Error('缺少小米账号或密码')
    }

    // 创建客户端
    console.log('正在创建客户端...')
    const client = new XiaoAi(account, password)

    // 连接到小米云
    console.log('正在连接小米云服务器...')
    await client.connect()
    console.log('✅ 连接成功')

    // 获取设备列表
    console.log('正在获取设备列表...')
    const devices = await client.getDevice()
    console.log(`✅ 获取到 ${devices.length} 个设备`)

    // 等待 session Promise 解析，获取完整的 session 信息
    console.log('正在提取 session 信息...')
    const session = await client.session

    // 提取 token 信息
    const tokenData = {
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      serviceToken: session.serviceToken || null,
      userId: session.userId || null,
      cookie: session.cookie || null,
      deviceId: session.deviceId || null,
      serialNumber: session.serialNumber || null,
      devices: devices.map((d) => ({
        name: d.name,
        deviceID: d.deviceID,
        model: d.model,
        serialNumber: d.serialNumber,
      })),
    }

    // 保存到文件
    fs.writeFileSync(
      'xiaomi_token.json',
      JSON.stringify(tokenData, null, 2),
      'utf-8',
    )
    console.log('✅ Token 已保存到 xiaomi_token.json')
    console.log(`   - 用户ID: ${tokenData.userId}`)
    console.log(`   - 设备数量: ${tokenData.devices.length}`)
  } catch (error) {
    console.error('❌ 获取 Token 失败:', error.message)
    if (error.stack) {
      console.error('错误堆栈:', error.stack)
    }
    process.exit(1)
  }
}

getAndSaveToken()
