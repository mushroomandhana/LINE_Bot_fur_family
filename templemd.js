import 'dotenv/config';
import linebot from 'linebot';
import axios from 'axios';

const bot = linebot({
channelId: process.env.CHANNEL_ID,
channelSecret: process.env.CHANNEL_SECRET,
channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

bot.on('message', async (event) => {
if (event.message.type !== 'text') return;

try {
const inputText = event.message.text.trim().toLowerCase();
const response = await axios.get('https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL');
const animalsData = response.data;

// 篩選出符合用戶查詢的動物資料
const filteredAnimals = animalsData.filter(animal => {
const address = animal.shelter_address.trim().toLowerCase();
return address.includes(inputText); // 直接檢查地址中是否包含用戶輸入的地區名稱
}).slice(0, 3);

        
        if (filteredAnimals.length > 0) {
            // 創建Flex Message
            const flexMessage = {
                type: 'flex',
                altText: '動物資訊',
                contents: {
                    type: 'carousel',
                    contents: filteredAnimals.map(animal => {
                        const areaName = animal.shelter_address.trim();
                        const sex = animal.animal_sex === 'M' ? '公' : animal.animal_sex === 'F' ? '母' : '未知';
                        return {
                            type: 'bubble',
                            hero: {
                                type: 'image',
                                url: animal.album_file, // 圖片URL
                                size: 'full',
                                aspectRatio: '20:13',
                                aspectMode: 'cover'
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: animal.animal_kind, // 品種
                                        weight: 'bold',
                                        size: 'xl'
                                    },
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        margin: 'lg',
                                        spacing: 'sm',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: `類別: ${animal.animal_kind}`,
                                                color: '#aaaaaa',
                                                size: 'sm'
                                            },
                                            {
                                                type: 'text',
                                                text: `性別: ${sex}`,
                                                color: '#aaaaaa',
                                                size: 'sm'
                                            },
                                            {
                                                type: 'text',
                                                text: `花色: ${animal.animal_colour}`,
                                                color: '#aaaaaa',
                                                size: 'sm'
                                            },
                                            {
                                                type: 'text',
                                                text: `地區: ${areaName}`,
                                                color: '#aaaaaa',
                                                size: 'sm'
                                            },
                                            {
                                                type: 'text',
                                                text: `機構: ${animal.shelter_name}`,
                                                color: '#aaaaaa',
                                                size: 'sm'
                                            },
                                            {
                                                type: 'text',
                                                text: `地址: ${animal.shelter_address}`,
                                                color: '#aaaaaa',
                                                size: 'sm'
                                            },
                                            {
                                                type: 'text',
                                                text: `電話: ${animal.shelter_tel}`,
                                                color: '#aaaaaa',
                                                size: 'sm'
                                            }
                                        ]
                                    }
                                ]
                            }
                        };
                    })
                }
            };

            // 使用axios發送回應
            await axios({
                method: 'post',
                url: 'https://api.line.me/v2/bot/message/reply',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
                },
                data: {
                    replyToken: event.replyToken,
                    messages: [flexMessage]
                }
            });

        } else {
            await event.reply({ type: 'text', text: '找不到符合條件的動物。請嘗試其他關鍵字。' });
        }
    } catch (error) {
        console.error('Error:', error);
        await event.reply({ type: 'text', text: '查詢時發生錯誤，請稍後再試。' });
    }
});

bot.listen('/', 3000, () => {
    console.log('Bot 啟動中...');
});

// import { Client } from '@line/bot-sdk';
// import fs from 'fs';
// import 'dotenv/config';
// import linebot from 'linebot';
// import axios from 'axios';

// 設定 LINE Bot 的存取權杖和密鑰
const config = {
    channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN', // 替換成你的 Channel access token
    channelSecret: 'Nj0GIBrrVbrIUQ2b302fCPwpTSeummsSTM0SPeE7hPaXiHF9wAUVtKEZHbbB/VJmUtaRqcqPDFq9dKVYbXs/iFIfZdy8nKH7QSRv7lJoIkot5lRHuKVchJtdD7PEz0IiHMX/TP+OG6wWZCO2x5NuRAdB04t89/1O/w1cDnyilFU=' // 替換成你的 Channel secret
    };
    
    // 創建 LINE Bot 客戶端
    const client = new Client(config);
    
    // 定義圖文選單的結構
    const richMenu = {
    size: {
    width: 2500,
    height: 1686
    },
    selected: false,
    name: 'My Rich Menu',
    chatBarText: 'Open the Rich Menu',
    areas: [
    {
    bounds: {
    x: 0,
    y: 0,
    width: 833,
    height: 843
    },
    action: {
    type: 'postback',
    data: 'action=buy&itemid=123'
    }
    },
    // ...其他區塊的設定...
    ]
    };
    
    // 創建圖文選單
    client.createRichMenu(richMenu)
    .then((richMenuId) => {
    console.log('Rich Menu has been created:', richMenuId);
    
    // 上傳圖文選單的圖片
    const imagePath = './images/richMenu.png'; // 替換成你的圖片路徑
    const imageBuffer = fs.readFileSync(imagePath);
    
    return client.setRichMenuImage(richMenuId, imageBuffer);
    })
    .then((response) => {
    console.log('Image has been uploaded:', response);
    })
    .catch((err) => {
    console.error(err);
    });