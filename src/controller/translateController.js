import axios from "axios";
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

const translate = async (text, goal, target) => {
    try {
        const response = await axios.get("https://api.mymemory.translated.net/get", {
            params: { q: text, langpair: `${goal}|${target}` },
        });

        console.log("Tổng hợp:", response.data);

        // Khởi tạo biến translatedText từ response chính
        let translatedText = response.data.responseData?.translatedText?.trim() || "";

        let matches = response.data.matches?.filter(match =>
            match.translation?.trim() &&
            !match.translation.includes("[object") &&
            !match.translation.toLowerCase().includes("hôi") &&
            !(match.translation.toLowerCase() === text.toLowerCase() && match.source === match.target)  // Điều kiện loại bỏ bản dịch giống gốc
        );

        if (matches?.length) {
            // Tìm max usage count để chuẩn hóa
            const maxUsageCount = Math.max(...matches.map(match => match["usage-count"]));

            const bestMatch = matches.reduce((best, current) => {
                const bestScore = calculateTranslationScore(best.match, best.quality, best["usage-count"], maxUsageCount);
                const currentScore = calculateTranslationScore(current.match, current.quality, current["usage-count"], maxUsageCount);

                if (currentScore > bestScore) {
                    return current;
                }
                return best;
            }, { match: 0, quality: 0, "usage-count": 0 });

            console.log("📌 Kết quả dịch:", bestMatch.translation);
            translatedText = bestMatch.translation || translatedText;
        }

        // Nếu có kết quả khớp, chọn bản dịch tốt nhất
        // if (matches?.length) {
        //     const bestMatch = matches.reduce((best, current) => {
        //         if (current.quality > best.quality ||
        //             (current.quality === best.quality && current["usage-count"] > best["usage-count"])) {
        //             return current;
        //         }
        //         return best;
        //     }, { quality: -1, "usage-count": -1 });

        //     console.log("📌 Kết quả dịch:", bestMatch.translation);
        //     translatedText = bestMatch.translation || translatedText;
        // }

        // Kiểm tra nếu bản dịch giống với nội dung gốc, chọn bản dịch khác
        if (translatedText.toLowerCase() === text.toLowerCase()) {
            console.log("📌 Nội dung gốc và bản dịch giống nhau. Sử dụng bản dịch khác.");
            translatedText = response.data.responseData?.translatedText || text;  // Lấy bản dịch khác nếu có
        }

        return translatedText || "Không có bản dịch phù hợp";
    } catch (error) {
        console.error("Lỗi dịch:", error);
        return `Lỗi dịch: ${error.message}`;
    }
};

const calculateTranslationScore = (match, quality, usageCount, maxUsageCount) => {
    // Tính toán tỷ lệ % của match, quality và usage-count
    const matchScore = match * 50;  // match là tỷ lệ từ 0 đến 1, nhân với 50%
    const qualityScore = quality * 0.3;  // quality là từ 0 đến 100, nhân với 30%
    const usageScore = (usageCount / maxUsageCount) * 20;  // usage-count là số lần sử dụng, chuẩn hóa với maxUsageCount

    const totalScore = matchScore + qualityScore + usageScore;
    return totalScore;
};

// const translate = async (text, goal, target) => {
//     try {
//         const response = await axios.get("https://api.mymemory.translated.net/get", {
//             params: {
//                 q: text,
//                 langpair: `${goal}|${target}`,
//             },
//         });

//         console.log("Tổng hợp:", response.data);

//         let matches = response.data.matches?.filter(match =>
//             match.translation?.trim() && !match.translation.includes("[object")
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

//         return translatedText || "Không có bản dịch phù hợp";
//     } catch (error) {
//         return `Lỗi dịch: ${error.message}`;
//     }
// };
// dịch từ en sang vi
const handleTranslate = async (req, res) => {
    let text = req.body.text;
    const target = "vi";
    const goal = "en";
    try {
        const translation = await translate(text, goal, target);
        res.json({ translation });
    } catch (error) {
        res.status(500).json({ error: "Translate failed", details: error.message });
    }
};


export default {
    handleTranslate, translate, detectLanguage
};
