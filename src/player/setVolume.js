const { ubus } = require('../lib/invoke')

// 设置音量
async function setVolume(ticket, volume) {
  // 边界限制，[0, 100]
  volume = Math.min(Math.max(volume, 0), 100)

  return ubus(ticket, {
    message: { volume },
    method: 'player_set_volume',
    path: 'mediaplayer'
  })
}

module.exports = setVolume
