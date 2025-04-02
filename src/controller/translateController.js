import axios from "axios";

const translate = async (text, target, goal) => {
    console.log("Text: ", text);
    try {
        const response = await axios.get("https://api.mymemory.translated.net/get", {
            params: {
                q: text,
                langpair: `${goal}|${target}`,
            },
        });

        console.log("Tổng hợp:", response.data);

        let matches = response.data.matches?.filter(match =>
            match.translation?.trim() && !match.translation.includes("[object")
        );

        if (matches?.length) {
            // Tìm bản dịch có quality cao nhất, nếu bằng nhau thì chọn usage-count cao nhất
            const bestMatch = matches.find(match => match.translation.toLowerCase() !== text.toLowerCase()) ||
                matches.reduce((best, current) => {
                    if (
                        current.quality > best.quality ||
                        (current.quality === best.quality && current["usage-count"] > best["usage-count"])
                    ) {
                        return current;
                    }
                    return best;
                }, { quality: -1, "usage-count": -1 });

            console.log("📌 Kết quả dịch:", bestMatch.translation);
            return bestMatch.translation;
        }

        return "Không có bản dịch phù hợp";
    } catch (error) {
        return `Lỗi dịch: ${error.message}`;
    }
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
