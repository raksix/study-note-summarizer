import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Anahtarı bulunamadı. Lütfen ortam değişkenlerini kontrol edin.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzePdfDocument = async (
  base64Data: string, 
  mimeType: string
): Promise<string> => {
  const ai = getGeminiClient();

  const modelId = "gemini-3-flash-preview"; 

  const prompt = `
    Sen üniversite seviyesinde bir eğitim asistanısın. Aşağıdaki PDF belgesini (ders notu, makale veya sınav sorusu olabilir) Türkçe olarak analiz et.

    Biçimlendirme Kuralları:
    1. **Latex Kullanımı**: Matematiksel formüller, denklemler veya karmaşıklık analizleri varsa (örneğin Big-O notasyonu), bunları mutlaka LaTeX formatında yaz. 
       - Satır içi formüller için tek dolar işareti kullan: $E = mc^2$
       - Blok formüller için çift dolar işareti kullan: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
    2. **Markdown Kullanımı**: Başlıkları, listeleri ve vurgulamaları düzgün Markdown formatında yap.

    Yanıt Formatı:

    ## 📄 Genel Bakış
    (Belgenin temel amacı ve kapsamı hakkında kısa özet.)

    ## 🔑 Temel Kavramlar ve Tanımlar
    (Belgede geçen en önemli terimler.)
    * **Kavram**: Tanım

    ## 🧠 Detaylı Konu Analizi
    (Belgenin içeriğini mantıksal bölümlere ayırarak derinlemesine açıkla. Varsa kod örneklerini veya algoritmaları analiz et.)

    ## 📊 Formüller ve Hesaplamalar (Eğer Varsa)
    (Belgede geçen önemli matematiksel bağıntıları LaTeX formatında açıkla.)

    ## 🎯 Genel Özet ve Çalışma Tavsiyeleri
    (Bu belgeden akılda kalması gereken en önemli 3 şey ve öğrencinin buna nasıl çalışması gerektiği.)
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    return response.text || "Analiz tamamlandı ancak içerik oluşturulamadı.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "PDF analiz edilirken bir hata oluştu.");
  }
};

export const generateGlobalSummary = async (summaries: string[]): Promise<string> => {
  const ai = getGeminiClient();
  const modelId = "gemini-3-flash-preview"; 

  const combinedText = summaries.join("\n\n--- DİĞER BELGE ---\n\n");

  const prompt = `
    Aşağıda farklı belgelerin özetleri bulunmaktadır. Bu özetleri birleştirerek tek bir "Bütünleşik Ders Özeti" oluştur.
    
    Tüm belgelerdeki ortak temaları, birbirini tamamlayan bilgileri birleştir.
    Matematiksel ifadeler için LaTeX formatı ($...$) kullan.
    
    Çıktı Formatı:
    # 📚 Bütünleşik Genel Özet
    
    ## 🔗 Ortak Konular ve Bağlantılar
    (Belgeler arasındaki ilişkiler)

    ## 📝 Birleştirilmiş Bilgi Özeti
    (Tüm bilgilerin sentezi)

    ## 🏆 Temel Çıkarımlar
    (Tüm setten öğrenilmesi gerekenler)
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: prompt + "\n\n" + combinedText }]
      }
    });
    return response.text || "Genel özet oluşturulamadı.";
  } catch (error: any) {
     throw new Error("Genel özet oluşturulurken hata oluştu.");
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};