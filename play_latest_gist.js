const fetch = require('node-fetch')
const fs = require('fs')
const XiaoAi = require('./src/index.js')

/**
 * 使用 GitHub Action 触发：读取「token Gist」中的 xiaomi_token.json 获取 session，
 * 然后读取「内容 Gist」中的最新内容，让小爱音箱播放（mp3）或朗读（文本）。
 *
 * 环境变量（建议在 GitHub Actions -> Secrets 中配置）：
 * - XIAOMI_TOKEN_GIST_ID：存放 xiaomi_token.json 的 Gist ID（必填，通常是私有）
 * - XIAOMI_TOKEN_GIST_TOKEN：可访问 token Gist 的 GitHub PAT（必填，权限仅勾选 gist 即可）
 * - XIAOMI_TOKEN_JSON_PATH：本地 token 文件路径（可选；不提供 token Gist 时使用，默认 xiaomi_token.json）
 *
 * - CONTENT_GIST_ID：你每天更新“要播报内容”的 Gist ID（必填；可公有/私有）
 * - CONTENT_GIST_TOKEN：若内容 Gist 为私有则需要（可选）
 *
 * - XIAOMI_DEVICE_ID：目标设备 deviceID（可选；不填则使用默认“东海郡”）
 * - XIAOMI_DEVICE_NAME：仅用于日志显示（可选）
 */

const DEFAULT_DEVICE_ID = '481a0f4b-e922-4b4e-952f-bd89ce9e930a' // 东海郡
const DEFAULT_CONTENT_GIST_ID = '98a0ff2a43ef197019f112f4a26b2574' // 你的每日内容 Gist

function assertEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`缺少环境变量：${name}`)
  return v
}

function readLocalTokenJson() {
  const p = process.env.XIAOMI_TOKEN_JSON_PATH || 'xiaomi_token.json'
  if (!fs.existsSync(p)) {
    throw new Error(
      `未找到本地 token 文件：${p}，请设置 XIAOMI_TOKEN_GIST_ID/XIAOMI_TOKEN_GIST_TOKEN，或提供 XIAOMI_TOKEN_JSON_PATH`,
    )
  }
  const raw = fs.readFileSync(p, 'utf-8')
  try {
    return JSON.parse(raw)
  } catch (e) {
    throw new Error(`解析本地 token JSON 失败: ${e.message}`)
  }
}

async function fetchText(url, token) {
  const headers = {
    'User-Agent': 'xiaoai-tts-action',
    Accept: 'application/vnd.github+json',
  }
  if (token) headers.Authorization = `token ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`请求失败: HTTP ${res.status} ${res.statusText}\n${body}`)
  }
  return res.text()
}

function pickGistFile(gistJson, preferredFilenames = []) {
  if (!gistJson || !gistJson.files) return null
  for (const name of preferredFilenames) {
    if (gistJson.files[name]) return gistJson.files[name]
  }
  // 兜底：取第一个文件
  return Object.values(gistJson.files)[0] || null
}

async function getGistFileContent({ gistId, gistToken, preferredFilenames }) {
  const gistApiUrl = `https://api.github.com/gists/${gistId}`
  const gistJsonText = await fetchText(gistApiUrl, gistToken)

  let gistJson
  try {
    gistJson = JSON.parse(gistJsonText)
  } catch (e) {
    throw new Error(`解析 Gist JSON 失败: ${e.message}`)
  }

  const file = pickGistFile(gistJson, preferredFilenames)
  if (!file) throw new Error('Gist 中未找到可读取的文件')

  let content = file.content
  if (file.truncated && file.raw_url) {
    console.log('检测到内容被截断，改用 raw_url 获取全文')
    content = await fetchText(file.raw_url, gistToken)
  }

  return { filename: file.filename, content: String(content || '') }
}

function extractFirstMp3Url(text) {
  // 匹配 markdown/纯文本里的 mp3 链接，避免把 ) ] 等结尾符号带进去
  const re = /https?:\/\/[^\s)\]]+\.mp3\b[^\s)\]]*/g
  const matches = String(text || '').match(re)
  if (!matches || matches.length === 0) return null
  return matches[0].replace(/[)\],.。]+$/g, '')
}

function extractMp3Urls(text) {
  const re = /https?:\/\/[^\s)\]]+\.mp3\b[^\s)\]]*/g
  const matches = String(text || '').match(re) || []
  const cleaned = matches
    .map((u) => String(u).replace(/[)\],.。]+$/g, ''))
    .filter((u) => u.length > 0)
  // 去重但保留顺序
  const seen = new Set()
  const uniq = []
  for (const u of cleaned) {
    if (seen.has(u)) continue
    seen.add(u)
    uniq.push(u)
  }
  return uniq
}

// 清洗乱码工具函数：保留中英文、数字、常用标点、空白
function cleanText(text) {
  return String(text || '').replace(
    /[^\u4e00-\u9fa5a-zA-Z0-9，。！？、；：""''()\[\]{}\s\-_/]/g,
    '',
  )
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitForPlaybackToFinish(client, opts = {}) {
  const pollIntervalSec = Number(
    process.env.POLL_INTERVAL_SEC || opts.pollIntervalSec || 5,
  )
  const maxTrackSec = Number(
    process.env.MAX_TRACK_SEC || opts.maxTrackSec || 1800,
  ) // 单段最多等待 30 分钟
  const minWaitSec = Number(process.env.MIN_TRACK_SEC || opts.minWaitSec || 5) // 避免刚开始就误判结束

  const start = Date.now()
  while (true) {
    const elapsedSec = (Date.now() - start) / 1000
    if (elapsedSec >= maxTrackSec) {
      console.log(`已等待 ${Math.round(elapsedSec)} 秒，达到上限，继续播下一段`)
      return
    }

    let status
    try {
      status = await client.getStatus()
    } catch (e) {
      // 状态查询失败时，稍等再试
      await sleep(pollIntervalSec * 1000)
      continue
    }

    // 约定：status.status == 2 为播放中（见 src/index.js 注释）
    const isPlaying = status && Number(status.status) === 2
    const detail = status && status.play_song_detail
    const duration = detail && Number(detail.duration)
    const position = detail && Number(detail.position)

    // 最少等待一会儿再做结束判断，减少误判
    if (elapsedSec < minWaitSec) {
      await sleep(pollIntervalSec * 1000)
      continue
    }

    // 1) 如果不是播放状态，认为已播完/已停止
    if (!isPlaying) return

    // 2) 如果能拿到时长和进度，接近结束则返回
    if (
      Number.isFinite(duration) &&
      duration > 0 &&
      Number.isFinite(position) &&
      position >= 0
    ) {
      if (duration - position <= 2) return
    }

    await sleep(pollIntervalSec * 1000)
  }
}

// 智能朗读：按句号/换行分段，逐段 say，并按长度等待
async function playSmartText(client, rawText) {
  let text = cleanText(rawText)
  text = text.replace(/\r\n/g, '\n')

  // 先按句号分段；如果没有句号，再按换行分段
  let segments = text
    .split('。')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => `${s}。`)

  if (segments.length <= 1) {
    segments = text
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }

  for (let i = 0; i < segments.length; i++) {
    const sentence = segments[i]
    console.log(`正在朗读第 ${i + 1}/${segments.length} 段：${sentence}`)
    await client.say(sentence)

    // 等待时间：每 6 个字等待 1 秒，最少 1 秒
    const waitSec = Math.max(1, Math.round(sentence.length / 5.5))
    if (i < segments.length - 1) {
      console.log(`等待 ${waitSec} 秒...`)
      await new Promise((r) => setTimeout(r, waitSec * 1000))
    }
  }
}

function buildSessionFromTokenJson(tokenJson) {
  const userId = tokenJson && tokenJson.userId
  const serviceToken = tokenJson && tokenJson.serviceToken
  const deviceId = tokenJson && tokenJson.deviceId
  const serialNumber = tokenJson && tokenJson.serialNumber

  if (!userId || !serviceToken) {
    throw new Error('token 文件缺少 userId 或 serviceToken')
  }

  // loginBySession 要求 deviceId + serialNumber 必填
  if (!deviceId || !serialNumber) {
    throw new Error(
      'token 文件缺少 deviceId 或 serialNumber（请先运行 get-token 工作流生成）',
    )
  }

  return { userId, serviceToken, deviceId, serialNumber }
}

async function main() {
  try {
    console.log('========== 开始播放/朗读 Gist 最新内容 ==========')

    const contentGistId = process.env.CONTENT_GIST_ID || DEFAULT_CONTENT_GIST_ID
    const contentGistToken = process.env.CONTENT_GIST_TOKEN || ''

    const deviceId = process.env.XIAOMI_DEVICE_ID || DEFAULT_DEVICE_ID
    const deviceName = process.env.XIAOMI_DEVICE_NAME || '目标设备'

    let tokenJson
    const tokenGistId = process.env.XIAOMI_TOKEN_GIST_ID
    const tokenGistToken = process.env.XIAOMI_TOKEN_GIST_TOKEN
    if (tokenGistId && tokenGistToken) {
      console.log(`准备读取 token Gist: ${tokenGistId}`)
      const tokenFile = await getGistFileContent({
        gistId: tokenGistId,
        gistToken: tokenGistToken,
        preferredFilenames: ['xiaomi_token.json'],
      })
      try {
        tokenJson = JSON.parse(tokenFile.content)
      } catch (e) {
        throw new Error(
          `解析 token Gist 中的 xiaomi_token.json 失败: ${e.message}`,
        )
      }
    } else {
      console.log('未提供 token Gist，改用本地 token 文件（仅适用于本地运行）')
      tokenJson = readLocalTokenJson()
    }

    const session = buildSessionFromTokenJson(tokenJson)
    console.log('✅ 已获取小米 session')

    console.log(`准备读取内容 Gist: ${contentGistId}`)
    const contentFile = await getGistFileContent({
      gistId: contentGistId,
      gistToken: contentGistToken,
      preferredFilenames: ['README.md'],
    })
    console.log(`✅ 已读取内容文件：${contentFile.filename}`)

    const mp3Urls = extractMp3Urls(contentFile.content)

    console.log('正在连接小爱音箱...')
    const client = new XiaoAi(session)
    await client.connect()
    console.log('✅ 连接成功')

    console.log(`正在切换到设备: ${deviceName}（${deviceId}）`)
    await client.useDevice(deviceId)
    console.log('✅ 已切换设备')

    if (mp3Urls.length > 0) {
      console.log(`检测到 ${mp3Urls.length} 个 mp3 链接，将依次播放`)
      for (let i = 0; i < mp3Urls.length; i++) {
        const url = mp3Urls[i]
        console.log(`开始播放第 ${i + 1}/${mp3Urls.length} 段：${url}`)
        await client.playUrl(url)
        console.log('已发送播放请求，等待本段播放结束...')
        await waitForPlaybackToFinish(client)
      }
      console.log('✅ 已按顺序播放完所有 mp3')
      return
    }

    console.log('未检测到 mp3 链接，改用 TTS 朗读文本')
    await playSmartText(client, contentFile.content)
    console.log('✅ 朗读完成')
  } catch (error) {
    console.error('❌ 执行失败:', error.message)
    if (error.stack) console.error(error.stack)
    process.exit(1)
  }
}

main()
