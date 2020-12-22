require('dotenv').config()
const { decryptMedia } = require('@open-wa/wa-automate')

const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Jakarta').locale('id')
const axios = require('axios')
const fetch = require('node-fetch')

const appRoot = require('app-root-path')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const db_group = new FileSync(appRoot + '/lib/data/group.json')
const db = low(db_group)
db.defaults({ group: [] }).write()

const {
    removeBackgroundFromImageBase64
} = require('remove.bg')

const {
    exec
} = require('child_process')

const {
    menuId,
    cekResi,
    urlShortener,
    meme,
    translate,
    getLocationData,
    images,
    resep,
    rugapoi,
    rugaapi,
    cariKasar
} = require('./lib')

const {
    msgFilter,
    color,
    processTime,
    isUrl,
    download
} = require('./utils')

const { uploadImages } = require('./utils/fetcher')

const fs = require('fs-extra')
const banned = JSON.parse(fs.readFileSync('./settings/banned.json'))
const simi = JSON.parse(fs.readFileSync('./settings/simi.json'))
const ngegas = JSON.parse(fs.readFileSync('./settings/ngegas.json'))
const setting = JSON.parse(fs.readFileSync('./settings/setting.json'))
const welcome = JSON.parse(fs.readFileSync('./settings/welcome.json'))

let {
    ownerNumber,
    groupLimit,
    memberLimit,
    prefix
} = setting

const {
    apiNoBg,
    apiSimi
} = JSON.parse(fs.readFileSync('./settings/api.json'))

function formatin(duit) {
    let reverse = duit.toString().split('').reverse().
('');
    let ribuan = reverse.match(/\d{1,3}/g);
    ribuan = ribuan.join('.').split('').reverse().join('');
    return ribuan;
}

const inArray = (needle, haystack) => {
    let length = haystack.length;
    for (let i = 0; i < length; i++) {
        if (haystack[i].id == needle) return i;
    }
    return false;
}

module.exports = HandleMsg = async (aruga, message) => {
    try {
        const { type, id, from, t, sender, author, isGroupMsg, chat, chatId, caption, isMedia, mimetype, quotedMsg, quotedMsgObj, mentionedJidList } = message
        let { body } = message
        var { name, formattedTitle } = chat
        let { pushname, verifiedName, formattedName } = sender
        pushname = pushname || verifiedName || formattedName // verifiedName is the name of someone who uses a business account
        const botNumber = await aruga.getHostNumber() + '@c.us'
        const groupId = isGroupMsg ? chat.groupMetadata.id : ''
        const groupAdmins = isGroupMsg ? await aruga.getGroupAdmins(groupId) : ''
        const isGroupAdmins = groupAdmins.includes(sender.id) || false
        const chats = (type === 'chat') ? body : (type === 'image' || type === 'video') ? caption : ''
        const pengirim = sender.id
        const isBotGroupAdmins = groupAdmins.includes(botNumber) || false

        // Bot Prefix
        body = (type === 'chat' && body.startsWith(prefix)) ? body : ((type === 'image' && caption || type === 'video' && caption) && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase()
        const arg = body.trim().substring(body.indexOf(' ') + 1)
        const args = body.trim().split(/ +/).slice(1)
        const argx = chats.slice(0).trim().split(/ +/).shift().toLowerCase()
        const isCmd = body.startsWith(prefix)
        const uaOverride = process.env.UserAgent
        const url = args.length !== 0 ? args[0] : ''
        const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
        const isQuotedVideo = quotedMsg && quotedMsg.type === 'video'

        // [IDENTIFY]
        const isOwnerBot = ownerNumber.includes(pengirim)
        const isBanned = banned.includes(pengirim)
        const isSimi = simi.includes(chatId)
        const isNgegas = ngegas.includes(chatId)
        const isKasar = await cariKasar(chats)

        // [BETA] Avoid Spam Message
        if (isCmd && msgFilter.isFiltered(from) && !isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && msgFilter.isFiltered(from) && isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        //
        if (!isCmd && isKasar && isGroupMsg) { console.log(color('[BADW]', 'orange'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${argx}`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        if (isCmd && !isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }

        // [BETA] Avoid Spam Message
        msgFilter.addFilter(from)

        //[AUTO READ] Auto read message 
        aruga.sendSeen(chatId)

        // Filter Banned People
        if (isBanned) {
            return console.log(color('[BAN]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname))
        }

        switch (command) {
            // Menu and TnC
            case 'speed':
            case 'ping':
                await aruga.sendText(from, `Vrauuu!!!!\nSpeed: ${processTime(t, moment())} _Segundos_`)
                break
            case 'tnc':
                await aruga.sendText(from, menuId.textTnC())
                break
            case 'notes':
            case 'menu':
            case 'help':
                await aruga.sendText(from, menuId.textMenu(pushname))
                    .then(() => ((isGroupMsg) && (isGroupAdmins)) ? aruga.sendText(from, `Menu Admin Grup: *${prefix}menuadmin*`) : null)
                break
            case 'menuadmin':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                await aruga.sendText(from, menuId.textAdmin())
                break
            case 'donate':
            case 'donasi':
                await aruga.sendText(from, menuId.textDonasi())
                break
            case 'ownerbot':
                await aruga.sendContact(from, ownerNumber)
                    .then(() => aruga.sendText(from, 'Se você quiser solicitar um recurso, converse com o número do proprietário!'))
                break
            case 'join':
                if (args.length == 0) return aruga.reply(from, `Se você quiser convidar o bot para o grupo, por favor, convide ou digite ${prefix}join [link group]`, id)
                let linkgrup = body.slice(6)
                let islink = linkgrup.match(/(https:\/\/chat.whatsapp.com)/gi)
                let chekgrup = await aruga.inviteInfo(linkgrup)
                if (!islink) return aruga.reply(from, 'Desculpe, o link do grupo está errado! por favor nos envie o link correto', id)
                if (isOwnerBot) {
                    await aruga.joinGroupViaLink(linkgrup)
                        .then(async () => {
                            await aruga.sendText(from, 'Entrou no grupo com sucesso via link!')
                            await aruga.sendText(chekgrup.id, `Olá, Eu sou Bot Zeus. Para descobrir os comandos neste tipo de bot, escreva ${prefix}menu`)
                        })
                } else {
                    let cgrup = await aruga.getAllGroups()
                    if (cgrup.length > groupLimit) return aruga.reply(from, `Desculpe, o grupo neste bot está cheio\nMax Grupo é: ${groupLimit}`, id)
                    if (cgrup.size < memberLimit) return aruga.reply(from, `Desculpe, o bot não entrará se os membros do grupo não excederem ${memberLimit} pessoas`, id)
                    await aruga.joinGroupViaLink(linkgrup)
                        .then(async () => {
                            await aruga.reply(from, 'Entrou no grupo com sucesso via link!', id)
                        })
                        .catch(() => {
                            aruga.reply(from, 'Falhou!', id)
                        })
                }
                break
            case 'botstat': {
                const loadedMsg = await aruga.getAmountOfLoadedMessages()
                const chatIds = await aruga.getAllChatIds()
                const groups = await aruga.getAllGroups()
                aruga.sendText(from, `Status by Bot Zeus :\n- *${loadedMsg}* Mensagens carregadas\n- *${groups.length}* Bate-papos em grupo\n- *${chatIds.length - groups.length}* Bate-papos pessoais\n- *${chatIds.length}* Total de Chats`)
                break
            }

            //Sticker Converter
            case 'stikertoimg':
            case 'stickertoimg':
            case 'stimg':
                if (quotedMsg && quotedMsg.type == 'sticker') {
                    const mediaData = await decryptMedia(quotedMsg)
                    aruga.reply(from, `Sendo processado! Por favor espere um momento...`, id)
                    const imageBase64 = `data:${quotedMsg.mimetype};base64,${mediaData.toString('base64')}`
                    await aruga.sendFile(from, imageBase64, 'imgsticker.jpg', 'Funciona para converter Figurinhas em Imagem!', id)
                        .then(() => {
                            console.log(`Adesivo para imagem processada para ${processTime(t, moment())} Segundos`)
                        })
                } else if (!quotedMsg) return aruga.reply(from, `Formato incorreto, marque a figurinha que deseja usar como imagem!`, id)
                break


            // Sticker Creator
            case 'coolteks':
            case 'cooltext':
                if (args.length == 0) return aruga.reply(from, `Para fazer CoolText texto legal em imagens, use ${prefix}cooltext teks\n\nExemplo: ${prefix}cooltext Bot Zeus`, id)
                rugaapi.cooltext(args[0])
                    .then(async (res) => {
                        await aruga.sendFileFromUrl(from, `${res.link}`, '', `${res.text}`, id)
                    })
                break
            case 'sticker':
            case 'stiker':
                if ((isMedia || isQuotedImage) && args.length === 0) {
                    const encryptMedia = isQuotedImage ? quotedMsg : message
                    const _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype
                    const mediaData = await decryptMedia(encryptMedia, uaOverride)
                    const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                    aruga.sendImageAsSticker(from, imageBase64)
                        .then(() => {
                            aruga.reply(from, 'Aqui está seu adesivo')
                            console.log(`Adesivo processado por ${processTime(t, moment())} Segundos`)
                        })
                } else if (args[0] === 'nobg') {
                    if (isMedia || isQuotedImage) {
                        try {
                            var mediaData = await decryptMedia(message, uaOverride)
                            var imageBase64 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                            var base64img = imageBase64
                            var outFile = './media/noBg.png'
                            // kamu dapat mengambil api key dari website remove.bg dan ubahnya difolder settings/api.json
                            var result = await removeBackgroundFromImageBase64({ base64img, apiKey: apiNoBg, size: 'auto', type: 'auto', outFile })
                            await fs.writeFile(outFile, result.base64img)
                            await aruga.sendImageAsSticker(from, `data:${mimetype};base64,${result.base64img}`)
                        } catch (err) {
                            console.log(err)
                            await aruga.reply(from, 'Desculpe, o limite de uso de hoje atingiu o máximo', id)
                        }
                    }
                } else if (args.length === 1) {
                    if (!isUrl(url)) { await aruga.reply(from, 'Desculpe, o link que você enviou é inválido.', id) }
                    aruga.sendStickerfromUrl(from, url).then((r) => (!r && r !== undefined)
                        ? aruga.sendText(from, 'Desculpe, o link que você enviou não contém uma imagem.')
                        : aruga.reply(from, 'Aqui está seu adesivo')).then(() => console.log(`Sticker Processed for ${processTime(t, moment())} Second`))
                } else {
                    await aruga.reply(from, `Sem imagens! Usar ${prefix}sticker\n\n\nEnvie fotos com legendas\n${prefix}sticker <usual>\n${prefix}sticker nobg <figurinha sem fundo>\n\nou enviar mensagem com\n${prefix}sticker <link da imagem>`, id)
                }
                break
            case 'brainly':
                if (!isGroupMsg) return aruga.reply(from, 'Este comando só pode ser usado em grupos!', id)



                if (args.length >= 2) {
                    const BrainlySearch = require('./lib/brainly')
                    let tanya = body.slice(9)
                    let jum = Number(tanya.split('.')[1]) || 2
                    if (jum > 10) return aruga.reply(from, 'Max 10!', id)
                    if (Number(tanya[tanya.length - 1])) {
                        tanya
                    }
                    aruga.reply(from, `➸ *Pertanyaan* : ${tanya.split('.')[0]}\n\n➸ *Jumlah jawaban* : ${Number(jum)}`, id)
                    await BrainlySearch(tanya.split('.')[0], Number(jum), function (res) {
                        res.forEach(x => {
                            if (x.jawaban.fotoJawaban.length == 0) {
                                aruga.reply(from, `➸ *Pertanyaan* : ${x.pertanyaan}\n\n➸ *Jawaban* : ${x.jawaban.judulJawaban}\n`, id)
                                aruga.sendText(from, 'Selesai ✅, donasi kesini ya paypal.me/TheSploit | Pulsa : 085754337101')
                            } else {
                                aruga.reply(from, `➸ *Pertanyaan* : ${x.pertanyaan}\n\n➸ *Jawaban* 〙: ${x.jawaban.judulJawaban}\n\n➸ *Link foto jawaban* : ${x.jawaban.fotoJawaban.join('\n')}`, id)
                            }
                        })
                    })
                } else {
                    aruga.reply(from, 'Usage :\n!brainly [pertanyaan] [.jumlah]\n\nEx : \n!brainly NKRI .2', id)
                }
                break
            case 'stickergif':
            case 'stikergif':
                if (isMedia || isQuotedVideo) {
                    if (mimetype === 'video/mp4' && message.duration < 10 || mimetype === 'image/gif' && message.duration < 10) {
                        var mediaData = await decryptMedia(message, uaOverride)
                        aruga.reply(from, '[ESPERE]Em andamento⏳ aguarde ± 1 min!', id)
                        var filename = `./media/stickergif.${mimetype.split('/')[1]}`
                        await fs.writeFileSync(filename, mediaData)
                        await exec(`gify ${filename} ./media/stickergf.gif --fps=30 --scale=240:240`, async function (error, stdout, stderr) {
                            var gif = await fs.readFileSync('./media/stickergf.gif', { encoding: "base64" })
                            await aruga.sendImageAsSticker(from, `data:image/gif;base64,${gif.toString('base64')}`)
                                .catch(() => {
                                    aruga.reply(from, 'Desculpe, o arquivo é muito grande!', id)
                                })
                        })
                    } else {
                        aruga.reply(from, `[❗] Envie um GIF com uma legenda *${prefix}stickergif* máx. 10 s!`, id)
                    }
                } else {
                    aruga.reply(from, `[❗] Envie um GIF com uma legenda *${prefix}stickergif*`, id)
                }
                break
            case 'stikergiphy':
            case 'stickergiphy':
                if (args.length !== 1) return aruga.reply(from, `Maaf, format pesan salah.\nKetik pesan dengan ${prefix}stickergiphy <link_giphy>`, id)
                const isGiphy = url.match(new RegExp(/https?:\/\/(www\.)?giphy.com/, 'gi'))
                const isMediaGiphy = url.match(new RegExp(/https?:\/\/media.giphy.com\/media/, 'gi'))
                if (isGiphy) {
                    const getGiphyCode = url.match(new RegExp(/(\/|\-)(?:.(?!(\/|\-)))+$/, 'gi'))
                    if (!getGiphyCode) { return aruga.reply(from, 'Gagal mengambil kode giphy', id) }
                    const giphyCode = getGiphyCode[0].replace(/[-\/]/gi, '')
                    const smallGifUrl = 'https://media.giphy.com/media/' + giphyCode + '/giphy-downsized.gif'
                    aruga.sendGiphyAsSticker(from, smallGifUrl).then(() => {
                        aruga.reply(from, 'Here\'s your sticker')
                        console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                    }).catch((err) => console.log(err))
                } else if (isMediaGiphy) {
                    const gifUrl = url.match(new RegExp(/(giphy|source).(gif|mp4)/, 'gi'))
                    if (!gifUrl) { return aruga.reply(from, 'Gagal mengambil kode giphy', id) }
                    const smallGifUrl = url.replace(gifUrl[0], 'giphy-downsized.gif')
                    aruga.sendGiphyAsSticker(from, smallGifUrl)
                        .then(() => {
                            aruga.reply(from, 'Aqui está seu adesivo')
                            console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                        })
                        .catch(() => {
                            aruga.reply(from, `Há um erro!`, id)
                        })
                } else {
                    await aruga.reply(from, 'Desculpe, o adesivo do comando giphy só pode usar o link do giphy.  [Giphy Somente]', id)
                }
                break
            case 'meme':
                if ((isMedia || isQuotedImage) && args.length >= 2) {
                    const top = arg.split('|')[0]
                    const bottom = arg.split('|')[1]
                    const encryptMedia = isQuotedImage ? quotedMsg : message
                    const mediaData = await decryptMedia(encryptMedia, uaOverride)
                    const getUrl = await uploadImages(mediaData, false)
                    const ImageBase64 = await meme.custom(getUrl, top, bottom)
                    aruga.sendFile(from, ImageBase64, 'image.png', '', null, true)
                        .then(() => {
                            aruga.reply(from, 'Obrigado!', id)
                        })
                        .catch(() => {
                            aruga.reply(from, 'Há um erro!')
                        })
                } else {
                    await aruga.reply(from, `Sem imagem! Por favor, envie uma foto com legenda ${prefix}meme <teks_atas> | <teks_bawah>\ncontoh: ${prefix}meme teks atas | teks bawah`, id)
                }
                break
            case 'quotemaker':
                const qmaker = body.trim().split('|')
                if (qmaker.length >= 3) {
                    const quotes = qmaker[1]
                    const author = qmaker[2]
                    const theme = qmaker[3]
                    aruga.reply(from, 'Prós como ..', id)
                    try {
                        const hasilqmaker = await images.quote(quotes, author, theme)
                        aruga.sendFileFromUrl(from, `${hasilqmaker}`, '', 'Este é irmão ..', id)
                    } catch {
                        aruga.reply('Bem, o processo falhou, irmão, ainda está correto?', id)
                    }
                } else {
                    aruga.reply(from, `Pemakaian ${prefix}quotemaker |isi quote|author|theme\n\ncontoh: ${prefix}quotemaker |aku sayang kamu|-aruga|random\n\nuntuk theme nya pakai random ya kak..`)
                }
                break
            case 'nulis':
                if (args.length == 0) return aruga.reply(from, `Membuat bot menulis teks yang dikirim menjadi gambar\nPemakaian: ${prefix}nulis [teks]\n\ncontoh: ${prefix}nulis i love you 3000`, id)
                const nulisq = body.slice(7)
                const nulisp = await rugaapi.tulis(nulisq)
                await aruga.sendImage(from, `${nulisp}`, '', 'Nih...', id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break

            //Islam Command
            case 'listsurah':
                try {
                    axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                        .then((response) => {
                            let hehex = '╔══✪〘 List Surah 〙✪══\n'
                            for (let i = 0; i < response.data.data.length; i++) {
                                hehex += '╠➥ '
                                hehex += response.data.data[i].name.transliteration.id.toLowerCase() + '\n'
                            }
                            hehex += '╚═〘 *E R I C K  B O T* 〙'
                            aruga.reply(from, hehex, id)
                        })
                } catch (err) {
                    aruga.reply(from, err, id)
                }
                break
            case 'infosurah':
                if (args.length == 0) return aruga.reply(from, `*_${prefix}infosurah <nama surah>_*\nMenampilkan informasi lengkap mengenai surah tertentu. Contoh penggunan: ${prefix}infosurah al-baqarah`, message.id)
                var responseh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                var { data } = responseh.data
                var idx = data.findIndex(function (post, index) {
                    if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                        return true;
                });
                var pesan = ""
                pesan = pesan + "Nama : " + data[idx].name.transliteration.id + "\n" + "Asma : " + data[idx].name.short + "\n" + "Arti : " + data[idx].name.translation.id + "\n" + "Jumlah ayat : " + data[idx].numberOfVerses + "\n" + "Nomor surah : " + data[idx].number + "\n" + "Jenis : " + data[idx].revelation.id + "\n" + "Keterangan : " + data[idx].tafsir.id
                aruga.reply(from, pesan, message.id)
                break
            case 'surah':
                if (args.length == 0) return aruga.reply(from, `*_${prefix}surah <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}surah al-baqarah 1\n\n*_${prefix}surah <nama surah> <ayat> en/id_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahannya dalam bahasa Inggris / Indonesia. Contoh penggunaan : ${prefix}surah al-baqarah 1 id`, message.id)
                var responseh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                var { data } = responseh.data
                var idx = data.findIndex(function (post, index) {
                    if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                        return true;
                });
                nmr = data[idx].number
                if (!isNaN(nmr)) {
                    var responseh2 = await axios.get('https://api.quran.sutanlab.id/surah/' + nmr + "/" + args[1])
                    var { data } = responseh2.data
                    var last = function last(array, n) {
                        if (array == null) return void 0;
                        if (n == null) return array[array.length - 1];
                        return array.slice(Math.max(array.length - n, 0));
                    };
                    bhs = last(args)
                    pesan = ""
                    pesan = pesan + data.text.arab + "\n\n"
                    if (bhs == "en") {
                        pesan = pesan + data.translation.en
                    } else {
                        pesan = pesan + data.translation.id
                    }
                    pesan = pesan + "\n\n(Q.S. " + data.surah.name.transliteration.id + ":" + args[1] + ")"
                    aruga.reply(from, pesan, message.id)
                }
                break
            case 'tafsir':
                if (args.length == 0) return aruga.reply(from, `*_${prefix}tafsir <nama surah> <ayat>_*\nMenampilkan ayat Al-Quran tertentu beserta terjemahan dan tafsirnya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}tafsir al-baqarah 1`, message.id)
                var responsh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                var { data } = responsh.data
                var idx = data.findIndex(function (post, index) {
                    if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                        return true;
                });
                nmr = data[idx].number
                if (!isNaN(nmr)) {
                    var responsih = await axios.get('https://api.quran.sutanlab.id/surah/' + nmr + "/" + args[1])
                    var { data } = responsih.data
                    pesan = ""
                    pesan = pesan + "Tafsir Q.S. " + data.surah.name.transliteration.id + ":" + args[1] + "\n\n"
                    pesan = pesan + data.text.arab + "\n\n"
                    pesan = pesan + "_" + data.translation.id + "_" + "\n\n" + data.tafsir.id.long
                    aruga.reply(from, pesan, message.id)
                }
                break
            case 'alaudio':
                if (args.length == 0) return aruga.reply(from, `*_${prefix}ALaudio <nama surah>_*\nMenampilkan tautan dari audio surah tertentu. Contoh penggunaan : ${prefix}ALaudio al-fatihah\n\n*_${prefix}ALaudio <nama surah> <ayat>_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Indonesia. Contoh penggunaan : ${prefix}ALaudio al-fatihah 1\n\n*_${prefix}ALaudio <nama surah> <ayat> en_*\nMengirim audio surah dan ayat tertentu beserta terjemahannya dalam bahasa Inggris. Contoh penggunaan : ${prefix}ALaudio al-fatihah 1 en`, message.id)
                ayat = "ayat"
                bhs = ""
                var responseh = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah.json')
                var surah = responseh.data
                var idx = surah.data.findIndex(function (post, index) {
                    if ((post.name.transliteration.id.toLowerCase() == args[0].toLowerCase()) || (post.name.transliteration.en.toLowerCase() == args[0].toLowerCase()))
                        return true;
                });
                nmr = surah.data[idx].number
                if (!isNaN(nmr)) {
                    if (args.length > 2) {
                        ayat = args[1]
                    }
                    if (args.length == 2) {
                        var last = function last(array, n) {
                            if (array == null) return void 0;
                            if (n == null) return array[array.length - 1];
                            return array.slice(Math.max(array.length - n, 0));
                        };
                        ayat = last(args)
                    }
                    pesan = ""
                    if (isNaN(ayat)) {
                        var responsih2 = await axios.get('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/islam/surah/' + nmr + '.json')
                        var { name, name_translations, number_of_ayah, number_of_surah, recitations } = responsih2.data
                        pesan = pesan + "Audio Quran Surah ke-" + number_of_surah + " " + name + " (" + name_translations.ar + ") " + "dengan jumlah " + number_of_ayah + " ayat\n"
                        pesan = pesan + "Dilantunkan oleh " + recitations[0].name + " : " + recitations[0].audio_url + "\n"
                        pesan = pesan + "Dilantunkan oleh " + recitations[1].name + " : " + recitations[1].audio_url + "\n"
                        pesan = pesan + "Dilantunkan oleh " + recitations[2].name + " : " + recitations[2].audio_url + "\n"
                        aruga.reply(from, pesan, message.id)
                    } else {
                        var responsih2 = await axios.get('https://api.quran.sutanlab.id/surah/' + nmr + "/" + ayat)
                        var { data } = responsih2.data
                        var last = function last(array, n) {
                            if (array == null) return void 0;
                            if (n == null) return array[array.length - 1];
                            return array.slice(Math.max(array.length - n, 0));
                        };
                        bhs = last(args)
                        pesan = ""
                        pesan = pesan + data.text.arab + "\n\n"
                        if (bhs == "en") {
                            pesan = pesan + data.translation.en
                        } else {
                            pesan = pesan + data.translation.id
                        }
                        pesan = pesan + "\n\n(Q.S. " + data.surah.name.transliteration.id + ":" + args[1] + ")"
                        await aruga.sendFileFromUrl(from, data.audio.secondary[0])
                        await aruga.reply(from, pesan, message.id)
                    }
                }
                break
            case 'jsolat':
                if (args.length == 0) return aruga.reply(from, `Untuk melihat jadwal solat dari setiap daerah yang ada\nketik: ${prefix}jsolat [daerah]\n\nuntuk list daerah yang ada\nketik: ${prefix}daerah`, id)
                const solatx = body.slice(8)
                const solatj = await rugaapi.jadwaldaerah(solatx)
                await aruga.reply(from, solatj, id)
                    .catch(() => {
                        aruga.reply(from, 'Pastikan daerah kamu ada di list ya!', id)
                    })
                break
            case 'daerah':
                const daerahq = await rugaapi.daerah()
                await aruga.reply(from, daerahq, id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            //Group All User
            case 'grouplink':
                if (!isBotGroupAdmins) return aruga.reply(from, 'Este comando só pode ser usado quando o bot se torna administrador', id)
                if (isGroupMsg) {
                    const inviteLink = await aruga.getGroupInviteLink(groupId);
                    aruga.sendLinkWithAutoPreview(from, inviteLink, `\nLink group *${name}* Use *${prefix}revoke* para redefinir o grupo de link`)
                } else {
                    aruga.reply(from, 'Este comando só pode ser usado em grupos!', id)
                }
                break
            case "revoke":
                if (!isBotGroupAdmins) return aruga.reply(from, 'Este comando só pode ser usado quando o bot se torna administrador', id)
                if (isBotGroupAdmins) {
                    aruga
                        .revokeGroupInviteLink(from)
                        .then((res) => {
                            aruga.reply(from, `Use com sucesso Revogar Link do Grupo *${prefix}grouplink* para obter o último link de convite de grupo`, id);
                        })
                        .catch((err) => {
                            console.log(`[ERR] ${err}`);
                        });
                }
                break;
            //Media
            case 'ytmp3':
                if (args.length == 0) return aruga.reply(from, `Untuk mendownload lagu dari youtube\nketik: ${prefix}ytmp3 [link_yt]`, id)
                const linkmp3 = args[0].replace('https://youtu.be/', '').replace('https://www.youtube.com/watch?v=', '')
                rugaapi.ytmp3(`https://youtu.be/${linkmp3}`)
                    .then(async (res) => {
                        if (res.error) return aruga.sendFileFromUrl(from, `${res.url}`, '', `${res.error}`)
                        await aruga.sendFileFromUrl(from, `${res.result.thumb}`, '', `Lagu ditemukan\n\nJudul: ${res.result.title}\nDesc: ${res.result.desc}\nSabar lagi dikirim`, id)
                        await aruga.sendFileFromUrl(from, `${res.result.url}`, '', '', id)
                            .catch(() => {
                                aruga.reply(from, `URL Ini ${args[0]} Sudah pernah di Download sebelumnya. URL Akan di Reset setelah 1 Jam/60 Menit`, id)
                            })
                    })
                break
            case 'ytmp4':
                if (args.length == 0) return aruga.reply(from, `Untuk mendownload lagu dari youtube\nketik: ${prefix}ytmp3 [link_yt]`, id)
                const linkmp4 = args[0].replace('https://youtu.be/', '').replace('https://www.youtube.com/watch?v=', '')
                rugaapi.ytmp4(`https://youtu.be/${linkmp4}`)
                    .then(async (res) => {
                        if (res.error) return aruga.sendFileFromUrl(from, `${res.url}`, '', `${res.error}`)
                        await aruga.sendFileFromUrl(from, `${res.result.thumb}`, '', `Lagu ditemukan\n\nJudul: ${res.result.title}\nDesc: ${res.result.desc}\nSabar lagi dikirim`, id)
                        await aruga.sendFileFromUrl(from, `${res.result.url}`, '', '', id)
                            .catch(() => {
                                aruga.reply(from, `URL Ini ${args[0]} Sudah pernah di Download sebelumnya. URL akan di Reset setelah 1 Jam/60 Menit`, id)
                            })
                    })
                break
            case 'fb':
            case 'facebook':
                if (args.length == 0) return aruga.reply(from, `Untuk mendownload video dari link facebook\nketik: ${prefix}fb [link_fb]`, id)
                rugaapi.fb(args[0])
                    .then(async (res) => {
                        const { link, linkhd, linksd } = res
                        if (res.status == 'error') return aruga.sendFileFromUrl(from, link, '', 'Maaf url anda tidak dapat ditemukan', id)
                        await aruga.sendFileFromUrl(from, linkhd, '', 'Nih ngab videonya', id)
                            .catch(async () => {
                                await aruga.sendFileFromUrl(from, linksd, '', 'Nih ngab videonya', id)
                                    .catch(() => {
                                        aruga.reply(from, 'Maaf url anda tidak dapat ditemukan', id)
                                    })
                            })
                    })
                break

            //Primbon Menu
            case 'cekzodiak':
                if (args.length !== 4) return aruga.reply(from, `Untuk mengecek zodiak, gunakan ${prefix}cekzodiak nama tanggallahir bulanlahir tahunlahir\nContoh: ${prefix}cekzodiak fikri 13 06 2004`, id)
                const cekzodiak = await rugaapi.cekzodiak(args[0], args[1], args[2])
                await aruga.reply(from, cekzodiak, id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'artinama':
                if (args.length == 0) return aruga.reply(from, `Untuk mengetahui arti nama seseorang\nketik ${prefix}artinama namakamu`, id)
                rugaapi.artinama(body.slice(10))
                    .then(async (res) => {
                        await aruga.reply(from, `Arti : ${res}`, id)
                    })
                break
            case 'cekjodoh':
                if (args.length !== 2) return aruga.reply(from, `Untuk mengecek jodoh melalui nama\nketik: ${prefix}cekjodoh nama-kamu nama-pasangan\n\ncontoh: ${prefix}cekjodoh bagas siti\n\nhanya bisa pakai nama panggilan (satu kata)`)
                rugaapi.cekjodoh(args[0], args[1])
                    .then(async (res) => {
                        await aruga.sendFileFromUrl(from, `${res.link}`, '', `${res.text}`, id)
                    })
                break

            // Random Kata
            case 'motivasi':
                fetch('https://raw.githubusercontent.com/selyxn/motivasi/main/motivasi.txt')
                    .then(res => res.text())
                    .then(body => {
                        let splitmotivasi = body.split('\n')
                        let randommotivasi = splitmotivasi[Math.floor(Math.random() * splitmotivasi.length)]
                        aruga.reply(from, randommotivasi, id)
                    })
                    .catch(() => {
                        aruga.reply(from, 'Algo deu errado!', id)
                    })
                break
            case 'howgay':
                if (args.length == 0) return aruga.reply(from, `Untuk mengetahui seberapa gay seseorang gunakan ${prefix}howgay namanya\n\nContoh: ${prefix}howgay burhan`, id)
                fetch('https://raw.githubusercontent.com/MrPawNO/howgay/main/howgay.txt')
                    .then(res => res.text())
                    .then(body => {
                        let splithowgay = body.split('\n')
                        let randomhowgay = splithowgay[Math.floor(Math.random() * splithowgay.length)]
                        aruga.reply(from, randomhowgay, id)
                    })
                    .catch(() => {
                        aruga.reply(from, 'Algo está errado!', id)
                    })
                break
            case 'fakta':
                fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/faktaunix.txt')
                    .then(res => res.text())
                    .then(body => {
                        let splitnix = body.split('\n')
                        let randomnix = splitnix[Math.floor(Math.random() * splitnix.length)]
                        aruga.reply(from, randomnix, id)
                    })
                    .catch(() => {
                        aruga.reply(from, 'Algo está errado!', id)
                    })
                break
            case 'katabijak':
                fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/katabijax.txt')
                    .then(res => res.text())
                    .then(body => {
                        let splitbijak = body.split('\n')
                        let randombijak = splitbijak[Math.floor(Math.random() * splitbijak.length)]
                        aruga.reply(from, randombijak, id)
                    })
                    .catch(() => {
                        aruga.reply(from, 'Algo está errado!', id)
                    })
                break
            case 'pantun':
                fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/pantun.txt')
                    .then(res => res.text())
                    .then(body => {
                        let splitpantun = body.split('\n')
                        let randompantun = splitpantun[Math.floor(Math.random() * splitpantun.length)]
                        aruga.reply(from, randompantun.replace(/aruga-line/g, "\n"), id)
                    })
                    .catch(() => {
                        aruga.reply(from, 'Algo está errado!', id)
                    })
                break
            case 'quote':
                const quotex = await rugaapi.quote()
                await aruga.reply(from, quotex, id)
                    .catch(() => {
                        aruga.reply(from, 'Algo está errado!', id)
                    })
                break
            case 'cerpen':
                rugaapi.cerpen()
                    .then(async (res) => {
                        await aruga.reply(from, res.result, id)
                    })
                break
            case 'cersex':
                rugaapi.cersex()
                    .then(async (res) => {
                        await aruga.reply(from, res.result, id)
                    })
                break
            case 'puisi':
                rugaapi.puisi()
                    .then(async (res) => {
                        await aruga.reply(from, res.result, id)
                    })
                break

            //Random Images
            case 'anime':
                if (args.length == 0) return aruga.reply(from, `Usar ${prefix}anime\nPor favor digite: ${prefix}anime [texto]\nExemplo: ${prefix}anime random\n\nconsultas disponíveis:\nrandom, waifu, husbu, neko`, id)
                if (args[0] == 'random' || args[0] == 'waifu' || args[0] == 'husbu' || args[0] == 'neko') {
                    fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/anime/' + args[0] + '.txt')
                        .then(res => res.text())
                        .then(body => {
                            let randomnime = body.split('\n')
                            let randomnimex = randomnime[Math.floor(Math.random() * randomnime.length)]
                            aruga.sendFileFromUrl(from, randomnimex, '', 'Nee..', id)
                        })
                        .catch(() => {
                            aruga.reply(from, 'Algo está errado!', id)
                        })
                } else {
                    aruga.reply(from, `Desculpe, a consulta não está disponível. Por favor digite ${prefix}anime para ver a lista de consulta`)
                }
                break
            case 'kpop':
                if (args.length == 0) return aruga.reply(from, `Usar ${prefix}kpop\nPor favor digite: ${prefix}kpop [texto]\nExemplo: ${prefix}kpop bts\n\nconsulta disponível:\nblackpink, exo, bts`, id)
                if (args[0] == 'blackpink' || args[0] == 'exo' || args[0] == 'bts') {
                    fetch('https://raw.githubusercontent.com/ArugaZ/grabbed-results/main/random/kpop/' + args[0] + '.txt')
                        .then(res => res.text())
                        .then(body => {
                            let randomkpop = body.split('\n')
                            let randomkpopx = randomkpop[Math.floor(Math.random() * randomkpop.length)]
                            aruga.sendFileFromUrl(from, randomkpopx, '', 'Nee..', id)
                        })
                        .catch(() => {
                            aruga.reply(from, 'Erro de algo!', id)
                        })
                } else {
                    aruga.reply(from, `Desculpe, a consulta não está disponível. Por favor digite ${prefix}kpop para ver a lista de consultas`)
                }
                break
            case 'memes':
                const randmeme = await meme.random()
                aruga.sendFileFromUrl(from, randmeme, '', '', id)
                    .catch(() => {
                        aruga.reply(from, 'Há um erro!', id)
                    })
                break

            // Search Any
            case 'dewabatch':
                if (args.length == 0) return aruga.reply(from, `Untuk mencari anime batch dari Dewa Batch, ketik ${prefix}dewabatch judul\n\nContoh: ${prefix}dewabatch naruto`, id)
                rugaapi.dewabatch(args[0])
                    .then(async (res) => {
                        await aruga.sendFileFromUrl(from, `${res.link}`, '', `${res.text}`, id)
                    })
                break
            case 'images':
                if (args.length == 0) return aruga.reply(from, `Untuk mencari gambar dari pinterest\nketik: ${prefix}images [search]\ncontoh: ${prefix}images naruto`, id)
                const cariwall = body.slice(8)
                const hasilwall = await images.fdci(cariwall)
                await aruga.sendFileFromUrl(from, hasilwall, '', '', id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'sreddit':
                if (args.length == 0) return aruga.reply(from, `Untuk mencari gambar dari sub reddit\nketik: ${prefix}sreddit [search]\ncontoh: ${prefix}sreddit naruto`, id)
                const carireddit = body.slice(9)
                const hasilreddit = await images.sreddit(carireddit)
                await aruga.sendFileFromUrl(from, hasilreddit, '', '', id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'resep':
                if (args.length == 0) return aruga.reply(from, `Untuk mencari resep makanan\nCaranya ketik: ${prefix}resep [search]\n\ncontoh: ${prefix}resep tahu`, id)
                const cariresep = body.slice(7)
                const hasilresep = await resep.resep(cariresep)
                await aruga.reply(from, hasilresep + '\n\nIni kak resep makanannya..', id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'nekopoi':
                rugapoi.getLatest()
                    .then((result) => {
                        rugapoi.getVideo(result.link)
                            .then((res) => {
                                let heheq = '\n'
                                for (let i = 0; i < res.links.length; i++) {
                                    heheq += `${res.links[i]}\n`
                                }
                                aruga.reply(from, `Title: ${res.title}\n\nLink:\n${heheq}\nmasih tester bntr :v`)
                            })
                    })
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'stalkig':
                if (args.length == 0) return aruga.reply(from, `Untuk men-stalk akun instagram seseorang\nketik ${prefix}stalkig [username]\ncontoh: ${prefix}stalkig ini.arga`, id)
                const igstalk = await rugaapi.stalkig(args[0])
                const igstalkpict = await rugaapi.stalkigpict(args[0])
                await aruga.sendFileFromUrl(from, igstalkpict, '', igstalk, id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'wiki':
                if (args.length == 0) return aruga.reply(from, `Untuk mencari suatu kata dari wikipedia\nketik: ${prefix}wiki [kata]`, id)
                const wikip = body.slice(6)
                const wikis = await rugaapi.wiki(wikip)
                await aruga.reply(from, wikis, id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'cuaca':
                if (args.length == 0) return aruga.reply(from, `Untuk melihat cuaca pada suatu daerah\nketik: ${prefix}cuaca [daerah]`, id)
                const cuacaq = body.slice(7)
                const cuacap = await rugaapi.cuaca(cuacaq)
                await aruga.reply(from, cuacap, id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'lyrics':
            case 'lirik':
                if (args.length == 0) return aruga.reply(from, `Untuk mencari lirik dari sebuah lagu\bketik: ${prefix}lirik [judul_lagu]`, id)
                rugaapi.lirik(body.slice(7))
                    .then(async (res) => {
                        await aruga.reply(from, `Lirik Lagu: ${body.slice(7)}\n\n${res}`, id)
                    })
                break
            case 'chord':
                if (args.length == 0) return aruga.reply(from, `Untuk mencari lirik dan chord dari sebuah lagu\bketik: ${prefix}chord [judul_lagu]`, id)
                const chordq = body.slice(7)
                const chordp = await rugaapi.chord(chordq)
                await aruga.reply(from, chordp, id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'ss': //jika error silahkan buka file di folder settings/api.json dan ubah apiSS 'API-KEY' yang kalian dapat dari website https://apiflash.com/
                if (args.length == 0) return aruga.reply(from, `Membuat bot men-screenshot sebuah web\n\nPemakaian: ${prefix}ss [url]\n\ncontoh: ${prefix}ss http://google.com`, id)
                const scrinshit = await meme.ss(args[0])
                await aruga.sendFile(from, scrinshit, 'ss.jpg', 'cekrek', id)
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'play'://silahkan kalian custom sendiri jika ada yang ingin diubah
                if (args.length == 0) return aruga.reply(from, `Untuk mencari lagu dari youtube\n\nPenggunaan: ${prefix}play judul lagu`, id)
                axios.get(`https://arugaytdl.herokuapp.com/search?q=${body.slice(6)}`)
                    .then(async (res) => {
                        await aruga.sendFileFromUrl(from, `${res.data[0].thumbnail}`, ``, `Lagu ditemukan\n\nJudul: ${res.data[0].title}\nDurasi: ${res.data[0].duration}detik\nUploaded: ${res.data[0].uploadDate}\nView: ${res.data[0].viewCount}\n\nsedang dikirim`, id)
                        rugaapi.ytmp3(`https://youtu.be/${res.data[0].id}`)
                            .then(async (res) => {
                                if (res.status == 'error') return aruga.sendFileFromUrl(from, `${res.link}`, '', `${res.error}`)
                                await aruga.sendFileFromUrl(from, `${res.thumb}`, '', `Lagu ditemukan\n\nJudul ${res.title}\n\nSabar lagi dikirim`, id)
                                await aruga.sendFileFromUrl(from, `${res.link}`, '', '', id)
                                    .catch(() => {
                                        aruga.reply(from, `URL Ini ${args[0]} Sudah pernah di Download sebelumnya. URL akan di Reset setelah 1 Jam/60 Menit`, id)
                                    })
                            })
                    })
                    .catch(() => {
                        aruga.reply(from, 'Ada yang Error!', id)
                    })
                break
            case 'movie':
                if (args.length == 0) return aruga.reply(from, `Untuk mencari suatu movie dari website sdmovie.fun\nketik: ${prefix}movie judulnya`, id)
                rugaapi.movie((body.slice(7)))
                    .then(async (res) => {
                        if (res.status == 'error') return aruga.reply(from, res.hasil, id)
                        await aruga.sendFileFromUrl(from, res.link, 'movie.jpg', res.hasil, id)
                    })
                break
            case 'whatanime':
                if (isMedia && type === 'image' || quotedMsg && quotedMsg.type === 'image') {
                    if (isMedia) {
                        var mediaData = await decryptMedia(message, uaOverride)
                    } else {
                        var mediaData = await decryptMedia(quotedMsg, uaOverride)
                    }
                    const fetch = require('node-fetch')
                    const imgBS4 = `data:${mimetype};base64,${mediaData.toString('base64')}`
                    aruga.reply(from, 'Searching....', id)
                    fetch('https://trace.moe/api/search', {
                        method: 'POST',
                        body: JSON.stringify({ image: imgBS4 }),
                        headers: { "Content-Type": "application/json" }
                    })
                        .then(respon => respon.json())
                        .then(resolt => {
                            if (resolt.docs && resolt.docs.length <= 0) {
                                aruga.reply(from, 'Desculpe, não sei o que é este anime, certifique-se de que a imagem a ser pesquisada não está desfocada / cortada', id)
                            }
                            const { is_adult, title, title_chinese, title_romaji, title_english, episode, similarity, filename, at, tokenthumb, anilist_id } = resolt.docs[0]
                            teks = ''
                            if (similarity < 0.92) {
                                teks = '*Saya memiliki keyakinan rendah dalam hal ini* :\n\n'
                            }
                            teks += `➸ *Title Japanese* : ${title}\n➸ *Title chinese* : ${title_chinese}\n➸ *Title Romaji* : ${title_romaji}\n➸ *Title English* : ${title_english}\n`
                            teks += `➸ *R-18?* : ${is_adult}\n`
                            teks += `➸ *Eps* : ${episode.toString()}\n`
                            teks += `➸ *Kesamaan* : ${(similarity * 100).toFixed(1)}%\n`
                            var video = `https://media.trace.moe/video/${anilist_id}/${encodeURIComponent(filename)}?t=${at}&token=${tokenthumb}`;
                            aruga.sendFileFromUrl(from, video, 'anime.mp4', teks, id).catch(() => {
                                aruga.reply(from, teks, id)
                            })
                        })
                        .catch(() => {
                            aruga.reply(from, 'Há um erro!', id)
                        })
                } else {
                    aruga.reply(from, `Desculpe, o formato está incorreto.\N\nPor favor, envie uma foto com uma legenda ${prefix}whatanime\n\nOu responda à foto com uma legenda ${prefix}whatanime`, id)
                }
                break

            // Other Command
            case 'resi':
                if (args.length !== 2) return aruga.reply(from, `Desculpe, o formato da mensagem está errado.\nPor favor, digite uma mensagem com ${prefix}resi <correio> <no_resi>\n\nCorreio disponível:\njne, pos, tiki, wahana, jnt, rpx, sap, sicepat, pcp, jet, dse, first, ninja, lion, idl, rex`, id)
                const kurirs = ['jne', 'pos', 'tiki', 'wahana', 'jnt', 'rpx', 'sap', 'sicepat', 'pcp', 'jet', 'dse', 'first', 'ninja', 'lion', 'idl', 'rex']
                if (!kurirs.includes(args[0])) return aruga.sendText(from, `O tipo de expedição de frete não é compatível. Este serviço só oferece suporte para expedição de frete ${kurirs.join(', ')} Por favor cheque novamente.`)
                console.log('Memeriksa No Resi', args[1], 'dengan ekspedisi', args[0])
                cekResi(args[0], args[1]).then((result) => aruga.sendText(from, result))
                break
            case 'tts':
                if (args.length == 0) return aruga.reply(from, `Converte texto em som (google voice)\ntipo: ${prefix}tts <kode_bahasa> <teks>\nexemplo: ${prefix}tts id halo\npara código de idioma verifique aqui: https://anotepad.com/note/read/5xqahdy8`)
                const ttsGB = require('node-gtts')(args[0])
                const dataText = body.slice(8)
                if (dataText === '') return aruga.reply(from, 'qual é o texto?..', id)
                try {
                    ttsGB.save('./media/tts.mp3', dataText, function () {
                        aruga.sendPtt(from, './media/tts.mp3', id)
                    })
                } catch (err) {
                    aruga.reply(from, err, id)
                }
                break
            case 'translate':
                if (args.length != 1) return aruga.reply(from, `Desculpe, o formato da mensagem está errado.\nResponda a uma mensagem com uma legenda ${prefix}translate <language_code>\nexemplo ${prefix}translate pt`, id)
                if (!quotedMsg) return aruga.reply(from, `Desculpe, o formato da mensagem está errado.\nResponda a uma mensagem com uma legenda ${prefix}translate <language_code>\nexemplo ${prefix}translate pt`, id)
                const quoteText = quotedMsg.type == 'chat' ? quotedMsg.body : quotedMsg.type == 'image' ? quotedMsg.caption : ''
                translate(quoteText, args[0])
                    .then((result) => aruga.sendText(from, result))
                    .catch(() => aruga.sendText(from, 'Erro, código de idioma errado.'))
                break
            case 'covidindo':
                rugaapi.covidindo()
                    .then(async (res) => {
                        await aruga.reply(from, `${res}`, id)
                    })
                break
            case 'ceklokasi':
                if (quotedMsg.type !== 'location') return aruga.reply(from, `Maaf, format pesan salah.\nKirimkan lokasi dan reply dengan caption ${prefix}ceklokasi`, id)
                console.log(`Solicitação de status da zona de expansão Covid-19 (${quotedMsg.lat}, ${quotedMsg.lng}).`)
                const zoneStatus = await getLocationData(quotedMsg.lat, quotedMsg.lng)
                if (zoneStatus.kode !== 200) aruga.sendText(from, 'Desculpe, ocorreu um erro ao verificar o local que você enviou.')
                let datax = ''
                for (let i = 0; i < zoneStatus.data.length; i++) {
                    const { zone, region } = zoneStatus.data[i]
                    const _zone = zone == 'green' ? 'Hijau* (Aman) \n' : zone == 'yellow' ? 'Kuning* (Waspada) \n' : 'Merah* (Bahaya) \n'
                    datax += `${i + 1}. Kel. *${region}* Berstatus *Zona ${_zone}`
                }
                const text = `*VERIFIQUE A LOCALIZAÇÃO DO SPREAD DE COVID*\nOs resultados da inspeção do local que você enviou são *${zoneStatus.status}* ${zoneStatus.optional}\n\nInformações sobre os locais afetados perto de você:\n${datax}`
                aruga.sendText(from, text)
                break
            case 'shortlink':
                if (args.length == 0) return aruga.reply(from, `tipo ${prefix}shortlink <url>`, id)
                if (!isUrl(args[0])) return aruga.reply(from, 'Desculpa, o url que você enviou é inválido.', id)
                const shortlink = await urlShortener(args[0])
                await aruga.sendText(from, shortlink)
                    .catch(() => {
                        aruga.reply(from, 'Há um erro!', id)
                    })
                break
            case 'bapakfont':
                if (args.length == 0) return aruga.reply(from, `Converte frases para  alayyyyy\n\nketik ${prefix}Palavras de babakvna`, id)
                rugaapi.bapakfont(body.slice(11))
                    .then(async (res) => {
                        await aruga.reply(from, `${res}`, id)
                    })
                break

            //Fun Menu
            case 'klasemen':
            case 'klasmen':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro do grupo!', id)
                const klasemen = db.get('group').filter({ id: groupId }).map('members').value()[0]
                let urut = Object.entries(klasemen).map(([key, val]) => ({ id: key, ...val })).sort((a, b) => b.denda - a.denda);
                let textKlas = "*Classificação de multas temporárias*\n"
                let i = 1;
                urut.forEach((klsmn) => {
                    textKlas += i + ". @" + klsmn.id.replace('@c.us', '') + " ➤ Rp" + formatin(klsmn.denda) + "\n"
                    i++
                });
                await aruga.sendTextWithMentions(from, textKlas)
                break

            // Group Commands (group admin only)
            case 'add':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (!isBotGroupAdmins) return aruga.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
                if (args.length !== 1) return aruga.reply(from, `Usar ${prefix}add\nUsar: ${prefix}add <número>\nexemplo: ${prefix}add 5521xxx`, id)
                try {
                    await aruga.addParticipant(from, `${args[0]}@c.us`)
                } catch {
                    aruga.reply(from, 'Não é possível adicionar alvo', id)
                }
                break
            case 'kick':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro do grupo!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (!isBotGroupAdmins) return aruga.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
                if (mentionedJidList.length === 0) return aruga.reply(from, 'Desculpe, o formato da mensagem está errado. \nPor favor, marque uma ou mais pessoas para excluir', id)
                if (mentionedJidList[0] === botNumber) return await aruga.reply(from, 'Desculpe, o formato da mensagem está incorreto. \nNão é possível emitir uma conta de bot sozinho', id)
                await aruga.sendTextWithMentions(from, `Pedido efetuado, banido kkkkk:\n${mentionedJidList.map(x => `@${x.replace('@c.us', '')}`).join('\n')}`)
                for (let i = 0; i < mentionedJidList.length; i++) {
                    if (groupAdmins.includes(mentionedJidList[i])) return await aruga.sendText(from, 'Falha, você não pode remover o administrador do grupo.')
                    await aruga.removeParticipant(groupId, mentionedJidList[i])
                }
                break
            case 'promote':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (!isBotGroupAdmins) return aruga.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
                if (mentionedJidList.length !== 1) return aruga.reply(from, 'Desculpe, só pode promover 1 usuário', id)
                if (groupAdmins.includes(mentionedJidList[0])) return await aruga.reply(from, 'Desculpe, o usuário já é um administrador.', id)
                if (mentionedJidList[0] === botNumber) return await aruga.reply(from, 'Desculpe, o formato da mensagem está errado.\nNão é possível promover sua própria conta de bot', id)
                await aruga.promoteParticipant(groupId, mentionedJidList[0])
                await aruga.sendTextWithMentions(from, `Pedido aceito, adicionado @${mentionedJidList[0].replace('@c.us', '')} como administrador.`)
                break
            case 'demote':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro do grupo!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (!isBotGroupAdmins) return aruga.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
                if (mentionedJidList.length !== 1) return aruga.reply(from, 'Desculpe, apenas 1 usuário pode ser rebaixado', id)
                if (!groupAdmins.includes(mentionedJidList[0])) return await aruga.reply(from, 'Desculpe, o usuário ainda não é um administrador.', id)
                if (mentionedJidList[0] === botNumber) return await aruga.reply(from, 'Desculpe, o formato da mensagem está errado.\nIncapaz de demonstrar a própria conta do bot', id)
                await aruga.demoteParticipant(groupId, mentionedJidList[0])
                await aruga.sendTextWithMentions(from, `Pedido aceito, excluir posição de(a) @${mentionedJidList[0].replace('@c.us', '')}.`)
            case 'bye':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                aruga.sendText(from, 'Adeus... ( ⇀‸↼‶ )').then(() => aruga.leaveGroup(groupId))
                break
            case 'del':
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (!quotedMsg) return aruga.reply(from, `Desculpe, o formato da mensagem está errado, por favor.\nResponda às mensagens do bot com uma legenda ${prefix}del`, id)
                if (!quotedMsgObj.fromMe) return aruga.reply(from, `Desculpe, o formato da mensagem está errado, por favor..\nResponda às mensagens do bot com uma legenda ${prefix}del`, id)
                aruga.deleteMessage(quotedMsgObj.chatId, quotedMsgObj.id, false)
                break
            case 'tagall':
            case 'everyone':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                const groupMem = await aruga.getGroupMembers(groupId)
                let hehex = '╔══✪〘 Menção a Todos 〙✪══\n'
                for (let i = 0; i < groupMem.length; i++) {
                    hehex += '╠➥'
                    hehex += ` @${groupMem[i].id.replace(/@c.us/g, '')}\n`
                }
                hehex += '╚═〘 *E R I C K  B O T* 〙'
                await aruga.sendTextWithMentions(from, hehex)
                break
            case 'simisimi':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
                aruga.reply(from, `Para ativar simi-simi no Chat de Grupo\n\nUsar\n${prefix}simi on --ativar\n${prefix}simi off --desligue\n`, id)
                break
            case 'simi':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro do grupo!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (args.length !== 1) return aruga.reply(from, `Para ativar simi-simi no Chat de Grupo\n\nUsar\n${prefix}simi on --ativar\n${prefix}simi off --desligue\n`, id)
                if (args[0] == 'on') {
                    simi.push(chatId)
                    fs.writeFileSync('./settings/simi.json', JSON.stringify(simi))
                    aruga.reply(from, 'Ativando o bot simi-simi!', id)
                } else if (args[0] == 'off') {
                    let inxx = simi.indexOf(chatId)
                    simi.splice(inxx, 1)
                    fs.writeFileSync('./settings/simi.json', JSON.stringify(simi))
                    aruga.reply(from, 'Desativar bots simi-simi!', id)
                } else {
                    aruga.reply(from, `Para ativar simi-simi no Chat de Grupo\n\nUsar\n${prefix}simi on --ativar\n${prefix}simi off --desligue\n`, id)
                }
                break
            case 'katakasar':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro do grupo!', id)
                aruga.reply(from, `Para ativar o recurso Palavras fortes no chat de grupo\n\nQual é a utilidade desse recurso? Se alguém disser palavras duras, ele receberá uma multa\n\nUse\n${prefix}kasar on --ativar\n${prefix}kasar off --desativar\n\n${prefix}reset --redefinir o valor da multa`, id)
                break
            case 'kasar':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro do grupo!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (args.length !== 1) return aruga.reply(from, `Para ativar o recurso Palavras fortes no chat de grupo\n\nQual é a utilidade desse recurso? Se alguém disser palavras duras, ele receberá uma multa\n\nUsar\n${prefix}kasar on --ativar\n${prefix}kasar off --desligue\n\n${prefix}reset --redefinir o valor da multa`, id)
                if (args[0] == 'on') {
                    ngegas.push(chatId)
                    fs.writeFileSync('./settings/ngegas.json', JSON.stringify(ngegas))
                    aruga.reply(from, 'O recurso Anti-Crude foi ativado', id)
                } else if (args[0] == 'off') {
                    let nixx = ngegas.indexOf(chatId)
                    ngegas.splice(nixx, 1)
                    fs.writeFileSync('./settings/ngegas.json', JSON.stringify(ngegas))
                    aruga.reply(from, 'O recurso Anti-Crude foi desativado', id)
                } else {
                    aruga.reply(from, `Para ativar o recurso Palavras fortes no chat de grupo\n\nQual é a utilidade desse recurso? Se alguém disser palavras duras, ele receberá uma multa\n\nUsar\n${prefix}kasar on --ativar\n${prefix}kasar off --desligue\n\n${prefix}reset --redefinir o valor da multa`, id)
                }
                break
            case 'reset':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro do grupo!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                const reset = db.get('group').find({ id: groupId }).assign({ members: [] }).write()
                if (reset) {
                    await aruga.sendText(from, "A classificação foi zerada.")
                }
                break
            case 'mutegrup':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro do grupo!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (!isBotGroupAdmins) return aruga.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
                if (args.length !== 1) return aruga.reply(from, `Para alterar as configurações do chat em grupo para que apenas o administrador possa bater papo\n\nUse:\n${prefix}mutegrup on --ativar\n${prefix}mutegrup off --desativar`, id)
                if (args[0] == 'on') {
                    aruga.setGroupToAdminsOnly(groupId, true).then(() => aruga.sendText(from, 'Alterado com sucesso para que apenas o administrador possa conversar!'))
                } else if (args[0] == 'off') {
                    aruga.setGroupToAdminsOnly(groupId, false).then(() => aruga.sendText(from, 'Alterado com sucesso para que todos os membros possam conversar!'))
                } else {
                    aruga.reply(from, `Para alterar as configurações do chat em grupo para que apenas o administrador possa bater papo\n\nUsar:\n${prefix}mutegrup on --ativar\n${prefix}mutegrup off --desativar`, id)
                }
                break
            case 'setprofile':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro do grupo!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (!isBotGroupAdmins) return aruga.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
                if (isMedia && type == 'image' || isQuotedImage) {
                    const dataMedia = isQuotedImage ? quotedMsg : message
                    const _mimetype = dataMedia.mimetype
                    const mediaData = await decryptMedia(dataMedia, uaOverride)
                    const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                    await aruga.setGroupIcon(groupId, imageBase64)
                } else if (args.length === 1) {
                    if (!isUrl(url)) { await aruga.reply(from, 'Desculpe, o link que você enviou é inválido.', id) }
                    aruga.setGroupIconByUrl(groupId, url).then((r) => (!r && r !== undefined)
                        ? aruga.reply(from, 'Desculpe, o link que você enviou não contém uma imagem.', id)
                        : aruga.reply(from, 'Alterou com sucesso o perfil do grupo', id))
                } else {
                    aruga.reply(from, `Este comando é usado para mudar o ícone / perfil do grupo de chat\n\n\nUsar:\n1.Envie / responda uma imagem com uma legenda ${prefix}setprofile\n\n2. Por favor digite ${prefix}setprofile linkImage`)
                }
                break
            case 'welcome':
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
                if (!isGroupAdmins) return aruga.reply(from, 'Falha, este comando só pode ser usado por administradores de grupo!', id)
                if (!isBotGroupAdmins) return aruga.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
                if (args.length !== 1) return aruga.reply(from, `Faça o BOT cumprimentar os membros que acabaram de entrar no chat em grupo!\n\nUsar:\n${prefix}welcome on --ativar\n${prefix}welcome off --desativar`, id)
                if (args[0] == 'on') {
                    welcome.push(chatId)
                    fs.writeFileSync('./settings/welcome.json', JSON.stringify(welcome))
                    aruga.reply(from, 'A mensagem de boas-vindas agora está ativada!', id)
                } else if (args[0] == 'off') {
                    let xporn = welcome.indexOf(chatId)
                    welcome.splice(xporn, 1)
                    fs.writeFileSync('./settings/welcome.json', JSON.stringify(welcome))
                    aruga.reply(from, 'A mensagem de boas-vindas agora está desativada', id)
                } else {
                    aruga.reply(from, `Faça o BOT cumprimentar os membros que acabaram de entrar no grupo de bate-papo!\n\nUsar:\n${prefix}welcome on --ativar\n${prefix}welcome off --desativar`, id)
                }
                break
 //Owner Group
            case 'kickall': //mengeluarkan semua member
                if (!isGroupMsg) return aruga.reply(from, 'Desculpe, este comando só pode ser usado dentro de grupos!', id)
                let isOwner = chat.groupMetadata.owner == pengirim
                if (!isOwner) return aruga.reply(from, 'Desculpe, este comando só pode ser usado pelo proprietário do grupo!', id)
                if (!isBotGroupAdmins) return aruga.reply(from, 'Falha, adicione o bot como administrador do grupo!', id)
                const allMem = await aruga.getGroupMembers(groupId)
                for (let i = 0; i < allMem.length; i++) {
                    if (groupAdmins.includes(allMem[i].id)) {

                    } else {
                        await aruga.removeParticipant(groupId, allMem[i].id)
                    }
                }
                aruga.reply(from, 'Sucesso em todos os membros', id)
                break

            //Owner Bot
            case 'ban':
                if (!isOwnerBot) return aruga.reply(from, 'Este pedido é apenas para proprietários do Bot!', id)
                if (args.length == 0) return aruga.reply(from, `Para banir alguém de usar comandos\n\nComo digitar: \n${prefix}ban add 628xx --ativar\n${prefix}ban del 628xx --desabilitar\n\ncomo banir rapidamente muitos tipos de grupos:\n${prefix}ban @tag @tag @tag`, id)
                if (args[0] == 'add') {
                    banned.push(args[1] + '@c.us')
                    fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                    aruga.reply(from, 'Alvo banido com sucesso!')
                } else
                    if (args[0] == 'del') {
                        let xnxx = banned.indexOf(args[1] + '@c.us')
                        banned.splice(xnxx, 1)
                        fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                        aruga.reply(from, 'Destino não banido com sucesso!')
                    } else {
                        for (let i = 0; i < mentionedJidList.length; i++) {
                            banned.push(mentionedJidList[i])
                            fs.writeFileSync('./settings/banned.json', JSON.stringify(banned))
                            aruga.reply(from, 'Alvo de proibição com sucesso!', id)
                        }
                    }
                break
            case 'bc': //untuk broadcast atau promosi
                if (!isOwnerBot) return aruga.reply(from, 'Este pedido é apenas para proprietários do Bot!', id)
                if (args.length == 0) return aruga.reply(from, `Para transmitir para todos os chats, digite:\n${prefix}bc [preencha o chat]`)
                let msg = body.slice(4)
                const chatz = await aruga.getAllChatIds()
                for (let idk of chatz) {
                    var cvk = await aruga.getChatById(idk)
                    if (!cvk.isReadOnly) aruga.sendText(idk, `〘 *E R I C K  B C* 〙\n\n${msg}`)
                    if (cvk.isReadOnly) aruga.sendText(idk, `〘 *E R I C K  B C* 〙\n\n${msg}`)
                }
                aruga.reply(from, 'Sucesso na transmissão!', id)
                break
            case 'leaveall': //mengeluarkan bot dari semua group serta menghapus chatnya
                if (!isOwnerBot) return aruga.reply(from, 'Este comando é apenas para proprietários do Bot', id)
                const allChatz = await aruga.getAllChatIds()
                const allGroupz = await aruga.getAllGroups()
                for (let gclist of allGroupz) {
                    await aruga.sendText(gclist.contact.id, `Desculpe, o bot está limpando, chat total está ativo : ${allChatz.length}`)
                    await aruga.leaveGroup(gclist.contact.id)
                    await aruga.deleteChat(gclist.contact.id)
                }
                aruga.reply(from, 'Sucesso, deixe todo o grupo!', id)
                break
            case 'clearall': //menghapus seluruh pesan diakun bot
                if (!isOwnerBot) return aruga.reply(from, 'Este comando é apenas para proprietários do Bot', id)
                const allChatx = await aruga.getAllChats()
                for (let dchat of allChatx) {
                    await aruga.deleteChat(dchat.id)
                }
                aruga.reply(from, 'Sucesso, limpar todo o chat!', id)
                break
            default:
                break
        }

        // Simi-simi function
        if ((!isCmd && isGroupMsg && isSimi) && message.type === 'chat') {
            axios.get(`https://arugaz.herokuapp.com/api/simisimi?kata=${encodeURIComponent(message.body)}&apikey=${apiSimi}`)
                .then((res) => {
                    if (res.data.status == 403) return aruga.sendText(ownerNumber, `${res.data.result}\n\n${res.data.pesan}`)
                    aruga.reply(from, `Simi disse: ${res.data.result}`, id)
                })
                .catch((err) => {
                    aruga.reply(from, `${err}`, id)
                })
        }

        // Kata kasar function
        if (!isCmd && isGroupMsg && isNgegas) {
            const find = db.get('group').find({ id: groupId }).value()
            if (find && find.id === groupId) {
                const cekuser = db.get('group').filter({ id: groupId }).map('members').value()[0]
                const isIn = inArray(pengirim, cekuser)
                if (cekuser && isIn !== false) {
                    if (isKasar) {
                        const denda = db.get('group').filter({ id: groupId }).map('members[' + isIn + ']').find({ id: pengirim }).update('denda', n => n + 5000).write()
                        if (denda) {
                            await aruga.reply(from, "Jangan badword bodoh\nDenda +5.000\nTotal : Rp" + formatin(denda.denda), id)
                        }
                    }
                } else {
                    const cekMember = db.get('group').filter({ id: groupId }).map('members').value()[0]
                    if (cekMember.length === 0) {
                        if (isKasar) {
                            db.get('group').find({ id: groupId }).set('members', [{ id: pengirim, denda: 5000 }]).write()
                        } else {
                            db.get('group').find({ id: groupId }).set('members', [{ id: pengirim, denda: 0 }]).write()
                        }
                    } else {
                        const cekuser = db.get('group').filter({ id: groupId }).map('members').value()[0]
                        if (isKasar) {
                            cekuser.push({ id: pengirim, denda: 5000 })
                            await aruga.reply(from, "Jangan badword bodoh\nDenda +5.000", id)
                        } else {
                            cekuser.push({ id: pengirim, denda: 0 })
                        }
                        db.get('group').find({ id: groupId }).set('members', cekuser).write()
                    }
                }
            } else {
                if (isKasar) {
                    db.get('group').push({ id: groupId, members: [{ id: pengirim, denda: 5000 }] }).write()
                    await aruga.reply(from, "Jangan badword bodoh\nDenda +5.000\nTotal : Rp5.000", id)
                } else {
                    db.get('group').push({ id: groupId, members: [{ id: pengirim, denda: 0 }] }).write()
                }
            }
        }
    } catch (err) {
        console.log(color('[EROR]', 'red'), err)
    }
}
