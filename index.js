import 'dotenv/config';
import linebot from 'linebot';
import axios from 'axios';
import { distance } from '../utils/distance.js'

const bot = linebot({
    channelId: process.env.CHANNEL_ID,
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

// 新增一個映射函數來處理特定字串
const queryMapping = {
    '我是貓派': '貓',
    '我是狗派': '狗',
    '我是??': '其他'
};

// 在bot初始化部分新增一個集合來存儲已顯示的動物ID
const shownAnimals = new Set();

bot.on('message', async (event) => {
    if (event.message.type !== 'text' || !event.message.text) {
        // 如果消息不是文本類型或者文本內容是空的，則不處理
        return;
    }
    const inputText = event.message.text.trim().toLowerCase();
    // 確保 inputText 不是 undefined
    if (!inputText) {
        // 處理 inputText 是 undefined 的情況
        return;
    }
    try {
        const response = await axios.get('https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL');
        if (!response.data || !Array.isArray(response.data)) {
            console.error('Error: Expected an array of data');
            // 處理錯誤情況，例如通過回復消息告知用戶
            await event.reply({ type: 'text', text: '無法獲取動物數據，請稍後再試。' });
            return;
        }
        const animalsData = response.data;

        // 解析用戶輸入的查詢條件
        let queries = inputText.split(' ').filter(q => q); // 移除空字符串

        // 使用映射函數處理特定查詢條件
        queries = queries.map(query => queryMapping[query] || query);


        // 特定查詢條件的處理
        if (inputText === '我是貓派') {
            queries.push('貓');
        } else if (inputText === '我是狗派') {
            queries.push('狗');
        } else if (inputText.startsWith('我是其他')) {
            queries.push(inputText.replace('我是其他', '').trim());
        } else if (inputText === '使用說明') {
            await event.reply({ type: 'text', text: '📄領養查詢，使用說明：📄\n\n😼🐶❓類別查詢，請輸入：貓、狗或其他\n\n花色查詢，請輸入：三花、虎斑、白色、黑色、黃色...\n\n性別查詢，請輸入：公或母\n\n所在地區查詢，請輸入：臺灣各縣市：臺北、屏東、澎湖...\n\n' });
            return;
        }

        // 篩選出符合用戶查詢的動物資料
        let filteredAnimals = animalsData.filter(animal => {
            const sex = animal.animal_sex === 'M' ? '公' : '母';
            const kind = animal.animal_kind.trim().toLowerCase();
            const color = animal.animal_colour.trim().toLowerCase();
            const address = animal.shelter_address.trim().toLowerCase();
            return queries.every(query =>
                sex.includes(query) ||
                kind.includes(query) ||
                color.includes(query) ||
                address.includes(query)
            );
        })
        const replies = data
            .map(d => {
                d.distance = distance(d.L_MapY, d.L_MapX, event.message.latitude, event.message.longitude, 'K')
                return d
            })
            .sort((a, b) => {
                return a.distance - b.distance
            })
            .slice(0, 10) // 查詢卡片則數最多10則 官方規定

            .map(d => {
                const t = template()
                t.body.contents[0].text = d.LL_Title
                t.body.contents[1].text = d.LL_Highlights
                t.body.contents[2].contents[0].contents[1].text = d.LL_Country + d.LL_Area + d.LL_Address
                t.body.contents[2].contents[1].contents[1].text = d.LL_OpeningData
                t.body.contents[2].contents[2].contents[1].text = d.LL_OpeningTime
                t.footer.contents[0].action.uri = `https://www.google.com/maps/search/?api=1&query=${d.L_MapY},${d.L_MapX}`
                t.footer.contents[1].action.uri = `https://taiwangods.moi.gov.tw/html/landscape/1_0011.aspx?i=${d.L_ID}`
                return t
            })


        // 如果所有動物都已顯示，則清空已顯示動物ID陣列並重新開始
        if (filteredAnimals.length === 0 && shownAnimals.size === animalsData.length) {
            shownAnimals.clear();
            filteredAnimals = animalsData;
        }

        // 從未顯示的動物中隨機選擇10個
        filteredAnimals = filteredAnimals.sort(() => 0.5 - Math.random()).slice(0, 10);

        // 更新已顯示的動物ID陣列
        filteredAnimals.forEach(animal => shownAnimals.add(animal.animal_id));


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
                        // 將地址轉換為URL編碼格式
                        const mapQuery = encodeURIComponent(areaName);
                        // 創建Google地圖的URL
                        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
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
                                                text: `機構: ${animal.shelter_name}`,
                                                color: '#aaaaaa',
                                                size: 'sm'
                                            },
                                            {
                                                type: 'text',
                                                text: `地址: ${areaName}`,
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
                            },

                            footer: {
                                type: 'box',
                                layout: 'vertical',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'button',
                                        style: 'link',
                                        height: 'sm',
                                        action: {
                                            type: 'uri',
                                            label: '地圖',
                                            uri: mapUrl
                                        }
                                    },
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        contents: [],
                                        margin: 'sm'
                                    }
                                ],
                                flex: 0
                            },

                        };
                    })
                }
            }

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

            await event.reply({ type: 'text', text: '找不到符合條件的動物，請嘗試其他關鍵字。' });
        }
    } catch (error) {
        console.error('Error:', error);
        await event.reply({ type: 'text', text: '查詢時發生錯誤，請稍後再試。' });
    }
});

bot.listen('/', 3000, () => {
    console.log('Bot 啟動中...');
});

