import translate from '@iamtraction/google-translate';

const handleTranslate = async (req, res) => {
    let text = req.body.text;

    try {
        const result = await translate(text, { to: 'vi' });
        return res.json({ translation: result.text });
    } catch (error) {
        console.error('Translate error:', error);
        return null;
    }
};

export default {
    handleTranslate, translate
};
