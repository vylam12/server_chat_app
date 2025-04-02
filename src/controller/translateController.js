import axios from "axios";
import fetch from "node-fetch";
const translate = async (text, target, goal) => {
    try {
        const res = await fetch("https://libretranslate.com/translate", {
            method: "POST",
            body: JSON.stringify({
                q: text,
                source: goal,  // Ngôn ngữ nguồn (ví dụ: 'en' cho tiếng Anh)
                target: target,  // Ngôn ngữ đích (ví dụ: 'vi' cho tiếng Việt)
            }),
            headers: { "Content-Type": "application/json" },
        });

        // Kiểm tra lỗi trả về từ API
        if (!res.ok) {
            throw new Error(`API Error: ${res.statusText}`);
        }

        const data = await res.json();
        console.log("Full API Response:", data);  // In toàn bộ phản hồi từ API
        if (data && data.translatedText) {
            return data.translatedText;
        } else {
            throw new Error("No translated text found in response.");
        }
    } catch (error) {
        console.error("Translation Error:", error.message);
        throw error;
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
    const goal = "en";
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
