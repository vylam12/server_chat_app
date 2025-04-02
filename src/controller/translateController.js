import axios from "axios";

const translate = async (text, target) => {
    console.log("Text: ", text);

    const apiKey = process.env.API_KEY;
    const appId = process.env.APP_ID;
    const url = 'https://api.xfyun.cn/v1/aiui/translate';  // Endpoint của API dịch

    try {
        const response = await axios.post(url, {
            text: text,
            target_lang: target,  // Ví dụ: 'zh' cho tiếng Trung, 'en' cho tiếng Anh
            app_id: appId,  // App ID của bạn
            api_key: apiKey
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.translation) {
            console.log('Kết quả dịch:', response.data.translation);
            return response.data.translation;
        } else {
            console.error('Không có kết quả dịch!');
            return 'Dịch thất bại';
        }
    } catch (error) {
        console.error('Lỗi khi gọi API:', error.message);
        return 'Dịch thất bại';
    }

    // try {
    //     const response = await axios.get("https://api.mymemory.translated.net/get", {
    //         params: {
    //             q: text,
    //             langpair: `${goal}|${target}`,
    //         },
    //     });

    //     console.log("Tổng hợp:", response.data);

    //     let matches = response.data.matches?.filter(match =>
    //         match.translation?.trim() && !match.translation.includes("[object")
    //     );

    //     if (matches?.length) {
    //         const bestMatch = matches.reduce((best, current) => {
    //             if (current.quality > best.quality ||
    //                 (current.quality === best.quality && current["usage-count"] > best["usage-count"])) {
    //                 return current;
    //             }
    //             return best;
    //         }, { quality: -1, "usage-count": -1 });

    //         console.log("📌 Kết quả dịch:", bestMatch.translation);
    //         return bestMatch.translation;
    //     }

    //     return "Không có bản dịch phù hợp";
    // } catch (error) {
    //     return `Lỗi dịch: ${error.message}`;
    // }
};

const handleTranslate = async (req, res) => {
    let text = req.body.text;
    const target = "vi";
    // const goal = "en";
    try {
        const translation = await translate(text, target, goal);
        res.json({ translation });
    } catch (error) {
        res.status(500).json({ error: "Translate failed", details: error.message });
    }
};



export default {
    handleTranslate, translate
};
