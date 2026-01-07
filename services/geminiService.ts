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

  // Using gemini-3-flash-preview as recommended for basic text tasks like summarization.
  const modelId = "gemini-3-flash-preview"; 

  const prompt = `
    Sen uzman bir eğitim asistanısın. Aşağıdaki PDF belgesini Türkçe olarak detaylı bir şekilde analiz et ve özetle.
    
    Lütfen yanıtını tam olarak şu Markdown formatında ver:

    ## 📄 Genel Bakış
    (Buraya belgenin ne hakkında olduğuna dair 2-3 cümlelik net bir özet yaz.)

    ## 🔑 Anahtar Kavramlar
    (Buraya belgedeki en kritik terimleri ve tanımlarını madde işaretleri ile yaz.)
    * **Kavram 1:** Tanım...
    * **Kavram 2:** Tanım...

    ## 🧠 Detaylı Analiz
    (Buraya belgedeki konuların mantıksal akışına göre, ders notu niteliğinde, başlıklar kullanarak detaylı bir özet çıkar. Önemli formüller, tarihler veya kişiler varsa vurgula.)

    ## 🎯 Sonuç ve Öneriler
    (Buraya bu belgeden çıkarılması gereken ana fikir ve öğrenci için çalışma tavsiyesi yaz.)

    Not: Sadece belge içeriğine odaklan. Harici bilgi ekleme.
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

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};