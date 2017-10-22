const http = require('request-promise-native')
const config = require('./config.json')
const fs = require('fs-extra')

const cache = fs.readFileSync('./cache.json') || {}
const cachedIp = cache.ip || ''

const recordRequest = {
    url: `https://api.godaddy.com/v1/domains/${config.domain}/records/${config.type}/${config.name}`,
    headers: {
        'Authorization': `sso-key ${config.key}:${config.secret}`,
        'Content-Type': 'application/json'
    }
}

const readIp = () => {
    return http.get(recordRequest).then(response => {
        return JSON.parse(response)[0]
    })
}

const updateIp = (godaddyIp, ip) => {
    const payload = [Object.assign(godaddyIp, { data: ip })]
    const request = Object.assign(recordRequest, { body: JSON.stringify(payload) })
    return http.put(request).then(() => {
        syncCachedIp(ip)
    })
}

const syncCachedIp = (ip) => {
    fs.writeJsonSync('./cache.json', { ip: ip })    
}

http.get('http://api.ipify.org')
    .then(currentIp => {
        if (currentIp === cachedIp) {
            console.log('current ip matches cached ip, no need to update.')
            return
        }
        return readIp()
            .then(godaddyIp => {
                if (godaddyIp.data === currentIp) {
                    console.log('godaddy ip matches current ip, updating cached ip and doing nothing.')
                    syncCachedIp(currentIp)
                    return
                }
                return updateIp(godaddyIp, currentIp)
            })
    }).catch(console.log)