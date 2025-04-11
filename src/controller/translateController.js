import axios from "axios";
import { translate } from '@vitalets/google-translate-api';
const detectLanguage = async (text) => {
    try {
        const response = await axios.get("https://api.mymemory.translated.net/get", {
            params: { q: text, langpair: "en|vi" },
        });

        const translatedText = response.data.responseData.translatedText.toLowerCase();

        // Nếu bản dịch giống hệt nội dung gốc, có thể nội dung gốc là tiếng Anh
        return translatedText === text.toLowerCase() ? "en" : "vi";
    } catch (error) {
        console.error("Lỗi xác định ngôn ngữ:", error.message);
        return "en"; // Mặc định là tiếng Anh nếu không xác định được
    }
};

// const translate = async (text, goal, target) => {
//     try {
//         const response = await axios.get("https://api.mymemory.translated.net/get", {
//             params: { q: text, langpair: `${goal}|${target}` },
//         });

//         console.log("Tổng hợp:", response.data);

//         let translatedText = response.data.responseData?.translatedText?.trim() || "";

//         let matches = response.data.matches?.filter(match =>
//             match.translation?.trim() &&
//             !match.translation.includes("[object") &&
//             !match.translation.toLowerCase().includes("hôi") &&
//             !(match.translation.toLowerCase() === text.toLowerCase() && match.source === match.target) &&
//             (match.source !== match.target || !isBothEnglishOrVietnamese(match.segment, match.translation))
//         );

//         if (matches?.length) {
//             const bestMatch = matches.reduce((best, current) => {
//                 if (current.quality > best.quality ||
//                     (current.quality === best.quality && current["usage-count"] > best["usage-count"])) {
//                     return current;
//                 }
//                 return best;
//             }, { quality: -1, "usage-count": -1 });

//             console.log("📌 Kết quả dịch:", bestMatch.translation);
//             translatedText = bestMatch.translation || translatedText;

//         }

//         if (translatedText.toLowerCase() === text.toLowerCase()) {
//             console.log("📌 Nội dung gốc và bản dịch giống nhau. Sử dụng bản dịch khác.");
//             translatedText = response.data.responseData?.translatedText || text;
//         }

//         return translatedText || "Không có bản dịch phù hợp";
//     } catch (error) {
//         console.error("Lỗi dịch:", error);
//         return `Lỗi dịch: ${error.message}`;
//     }
// };

const isBothEnglishOrVietnamese = (segment, translation) => {
    const englishRegex = /^[a-zA-Z0-9\s.,!?'-]*$/;
    const vietnameseRegex = /^[\u00C0-\u1EF9\u20AB\u2022\s.,!?'-]*$/; // Bao gồm các ký tự tiếng Việt

    return (englishRegex.test(segment) && englishRegex.test(translation)) ||
        (vietnameseRegex.test(segment) && vietnameseRegex.test(translation));
};

const handleTranslate = async (req, res) => {
    let text = req.body.text;
    // const target = "vi";
    // const goal = "en";
    // try {
    //     const translation = await translate(text, goal, target);
    //     res.json({ translation });
    // } catch (error) {
    //     res.status(500).json({ error: "Translate failed", details: error.message });
    // }

    try {
        const result = await translate(text, { to: en });
        return res.json({ translation: result.text });
    } catch (error) {
        console.error('Translate error:', error);
        return null;
    }
};


export default {
    handleTranslate, translate, detectLanguage
};
