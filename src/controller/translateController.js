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

        // Nếu có kết quả khớp, chọn bản dịch tốt nhất
        if (matches?.length) {
            const bestMatch = matches.reduce((best, current) => {
                if (current.quality > best.quality ||
                    (current.quality === best.quality && current["usage-count"] > best["usage-count"])) {
                    return current;
                }
                return best;
            }, { quality: -1, "usage-count": -1 });

            console.log("📌 Kết quả dịch:", bestMatch.translation);
            translatedText = bestMatch.translation || translatedText;
        }

        // Kiểm tra nếu bản dịch giống với nội dung gốc, không dịch lại
        if (translatedText.toLowerCase() === text.toLowerCase()) {
            console.log("📌 Nội dung gốc và bản dịch giống nhau. Không cần dịch lại.");
            return text;  // Trả lại nội dung gốc nếu không thay đổi
        }

        return translatedText || "Không có bản dịch phù hợp";
    } catch (error) {
        console.error("Lỗi dịch:", error);
        return `Lỗi dịch: ${error.message}`;
    }
};



// const translate = async (text, goal, target) => {
//     try {
//         const response = await axios.get("https://api.mymemory.translated.net/get", {
//             params: { q: text, langpair: `${goal}|${target}` },
//         });

//         console.log("Tổng hợp:", response.data);

//         // Khởi tạo biến translatedText từ response chính
//         let translatedText = response.data.responseData?.translatedText?.trim() || "";

//         let matches = response.data.matches?.filter(match =>
//             match.translation?.trim() &&
//             !match.translation.includes("[object") &&
//             !match.translation.toLowerCase().includes("hôi") &&
//             !(match.translation.toLowerCase() === text.toLowerCase() && match.source === match.target)  // Điều kiện loại bỏ bản dịch giống gốc
//         );

//         // Nếu có kết quả khớp, chọn bản dịch tốt nhất
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

//         // Kiểm tra nếu bản dịch giống với nội dung gốc, không dịch lại
//         if (translatedText.toLowerCase() === text.toLowerCase()) {
//             console.log("📌 Nội dung gốc và bản dịch giống nhau. Không cần dịch lại.");
//             return text;  // Trả lại nội dung gốc nếu không thay đổi
//         }

//         return translatedText || "Không có bản dịch phù hợp";
//     } catch (error) {
//         console.error("Lỗi dịch:", error);
//         return `Lỗi dịch: ${error.message}`;
//     }
// };

// const translate = async (text, goal, target) => {
//     try {
//         const response = await axios.get("https://api.mymemory.translated.net/get", {
//             params: { q: text, langpair: `${goal}|${target}` },
//         });

//         console.log("Tổng hợp:", response.data);

//         // Khởi tạo biến translatedText từ response chính
//         let translatedText = response.data.responseData?.translatedText?.trim() || "";

//         let matches = response.data.matches?.filter(match =>
//             match.translation?.trim() &&
//             !match.translation.includes("[object") &&
//             !match.translation.toLowerCase().includes("hôi") &&
//             !(match.translation.toLowerCase() === text.toLowerCase() && match.source === match.target)
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
//         console.error("Lỗi dịch:", error);
//         return `Lỗi dịch: ${error.message}`;
//     }
// };

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
