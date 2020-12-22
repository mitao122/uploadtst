const fs = require('fs-extra')
const { 
    prefix
} = JSON.parse(fs.readFileSync('./settings/setting.json'))

/*
Por favor, não remova meu link do github, você precisa do seu apoio! obrigado.

*/

exports.textTnC = () => {
    return `
Source code / bot ini merupakan program open-source (gratis) yang ditulis menggunakan Javascript, kamu dapat menggunakan, menyalin, memodifikasi, menggabungkan, menerbitkan, mendistribusikan, mensublisensikan, dan atau menjual salinan dengan tanpa menghapus author utama dari source code / bot ini.

Dengan menggunakan source code / bot ini maka anda setuju dengan Syarat dan Kondisi sebagai berikut:
- Source code / bot tidak menyimpan data anda di server kami.
- Source code / bot tidak bertanggung jawab atas perintah anda kepada bot ini.
- Source code / bot anda bisa lihat di https://github.com/ArugaZ/whatsapp-bot

Instagram: https://instagram.com/ini.arga/

Best regards, ArugaZ.`
}

/*

Por favor, não remova meu link do github, você precisa do meu apoio! obrigado.

*/

exports.textMenu = (pushname) => {
    return `
Olá, ${pushname}! 👋️
Aqui estão alguns dos recursos deste bot!✨

Criar:

-❥ *${prefix}sticker*
-❥ *${prefix}stickergif*
-❥ *${prefix}stickergiphy*
-❥ *${prefix}meme*
-❥ *${prefix}quotemaker*
-❥ *${prefix}nulis*

Menu divertido (Group):
-❥ *${prefix}simisimi*

Download:
-❥ *${prefix}facebook*

Pesquisar aleatoria:
-❥ *${prefix}images*
-❥ *${prefix}stalkig*
-❥ *${prefix}wiki*
-❥ *${prefix}ss*
-❥ *${prefix}play*
-❥ *${prefix}movie*
-❥ *${prefix}whatanime*

Imagens Aleatórias:
-❥ *${prefix}anime*
-❥ *${prefix}kpop*
-❥ *${prefix}memes*

Etc:
-❥ *${prefix}tts*
-❥ *${prefix}translate*
-❥ *${prefix}grouplink*
-❥ *${prefix}revoke*

_-_-_-_-_-_-_-_-_-_-_-_-_-_

Owner Bot:
-❥ *${prefix}ban* - banido
-❥ *${prefix}bc* - promover
-❥ *${prefix}leaveall* - sair de todos os grupos
-❥ *${prefix}clearall* - deletar todos os chats

                      ✵ βØŦ Ž€ỮŞ ✵

Espero que você tenha um ótimo dia!✨`
}

/*

Por favor, não remova meu link do github, você precisa do meu apoio! obrigado.

*/

exports.textAdmin = () => {
    return `
⚠ [ *Apenas Admin de Grupo* ] ⚠ 
A seguir estão os recursos de administração de grupo disponíveis neste bot!

-❥ *${prefix}add*
-❥ *${prefix}kick* @tag
-❥ *${prefix}promote* @tag
-❥ *${prefix}demote* @tag
-❥ *${prefix}mutegrup*
-❥ *${prefix}tagall*
-❥ *${prefix}setprofile*
-❥ *${prefix}del*
-❥ *${prefix}welcome*

_-_-_-_-_-_-_-_-_-_-_-_-_-_

⚠ [ *Grupo do proprietários apenas* ] ⚠
A seguir está o recurso de proprietário do grupo disponível neste bot!
-❥ *${prefix}kickall*
*O grupo proprietário é o criador do grupo.*
`
}

/*

Por favor, não remova meu link do github, você precisa do meu apoio! obrigado.

*/

exports.textDonasi = () => {
    return `
Olá, obrigado por usar este bot, para apoiar este bot você pode ajudar doando de alguma forma:

https://trakteer.id/arugabot

Ore para que o projeto do bot continue crescendo
Ore por ideias mais criativas para o autor do bot

A doação será usada para o desenvolvimento e operação deste bot.

Tobrigado. -ArugaZ`
}
