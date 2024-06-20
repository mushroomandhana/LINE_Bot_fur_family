import 'dotenv/config'
import linebot from 'linebot'
import axios from 'axios'

const bot = linebot({
    channelId: process.env.CHANNEL_ID,
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})

const queryMapping = {
    '我是貓派': '貓',
    '我是狗派': '狗',
    '我是??': '其他',
    '其他': '其他'
};

let animalsData = []; // 將來從API獲取動物資料

// 新增 queryHistory 映射
const queryHistory = new Map();

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 異步函式：從API獲取動物資料並存儲在animalsData中
async function fetchAnimalsData() {
    try {
        const response = await axios.get('https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL');
        animalsData = response.data;
    } catch (error) {
        console.error('Error fetching animal data:', error);
    }
}

// 初始化時執行一次動物資料的快取
fetchAnimalsData();

bot.on('message', async (event) => {
    try {
        if (event.message.type !== 'text' || !event.message.text) {
            return; // 非文本消息或文本內容為空，直接返回
        }

        const inputText = event.message.text.trim().toLowerCase();
        let queries = inputText.split(/\s+/); // Split input into separate queries

        // 特定查詢條件的處理，移到過濾之前
        if (inputText === '我是貓派') {
            queries.push('貓');
        } else if (inputText === '我是狗派') {
            queries.push('狗');
        } else if (inputText.startsWith('我是??')) {
            queries.push('其他');
        } else if (inputText === '使用說明') {
            await event.reply({
                type: 'text',
                text: '📄領養查詢，使用說明：📄\n\n😼🐶❓類別查詢，請輸入：貓、狗或其他\n\n花色查詢，請輸入：三花、虎斑、白色、黑色、黃色...\n\n性別查詢，請輸入：公或母\n\n所在地區查詢，請輸入：臺灣各縣市：臺北、屏東、澎湖...\n\n'
            });
            return;
        }

        // 解析用戶輸入的查詢條件
        queries = queries.map(query => queryMapping[query] || query);

        // 從 queryHistory 映射中獲取之前的查詢結果
        const previousResults = queryHistory.get(event.message.text) || new Set();

        // 隨機打亂 animalsData 陣列
        let shuffledAnimals = animalsData.sort(() => 0.5 - Math.random());

        // 過濾出還沒有顯示過的動物
        let filteredAnimals = shuffledAnimals.filter(animal => !previousResults.has(animal.animal_id));

        // 如果過濾後的結果不足10個，則從已顯示的動物中隨機選擇補充
        if (filteredAnimals.length < 10) {
            const supplementAnimals = shuffledAnimals.filter(animal => previousResults.has(animal.animal_id)).sort(() => 0.5 - Math.random());
            filteredAnimals = [...filteredAnimals, ...supplementAnimals.slice(0, 10 - filteredAnimals.length)];
        }

        // 更新 queryHistory 映射
        filteredAnimals.forEach(animal => previousResults.add(animal.animal_id));
        queryHistory.set(event.message.text, previousResults);

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
                        const mapQuery = encodeURIComponent(areaName);
                        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

                        return {
                            type: 'bubble',
                            hero: {
                                type: 'image',
                                url: animal.album_file,
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
                                        text: animal.animal_kind,
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
                                            label: '地圖找我',
                                            uri: mapUrl
                                        }
                                    },
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        contents: [],
                                        margin: 'sm'
                                    },
                                    {
                                        type: 'button',
                                        style: 'link',
                                        height: 'sm',
                                        action: {
                                            type: 'uri',
                                            label: '網站查詢',
                                            uri: 'https://www.pet.gov.tw/AnimalApp/AnnounceMent.aspx?PageType=Adopt'
                                        }
                                    }
                                ],
                                flex: 0
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
            // 如果找不到符合條件的動物
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
