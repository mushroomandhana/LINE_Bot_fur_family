import 'dotenv/config';
import linebot from 'linebot';
import axios from 'axios';
// const PORT = process.env.PORT || 3030;

// app.listen(PORT, () => {
//   console.log(`server started on port ${PORT}`);
// })

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

bot.on('message', async (event) => {
if (event.message.type !== 'text') return;

try {
const inputText = event.message.text.trim().toLowerCase();
const response = await axios.get('https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL');
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
const filteredAnimals = animalsData.filter(animal => {
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


