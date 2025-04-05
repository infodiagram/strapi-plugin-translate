'use strict'

import OpenAI from 'openai'

interface ProviderOptions {
  apiKey?: string
  localeMap?: Record<string, string>
  apiOptions?: Record<string, any>
}

interface TranslateOptions {
  text: string | string[] | any[]
  sourceLocale: string
  targetLocale: string
  priority: number
  format?: 'plain' | 'markdown' | 'html'
}


const OpenAIProvider = {
  provider: 'openai',
  name: 'OpenAI',

  init(providerOptions: ProviderOptions = {}) {
    // Mocked initialization logic
    console.log('Initializing OpenAI provider with options:', providerOptions)
    const client = new OpenAI({
      apiKey: providerOptions.apiKey,
    })
    return {
      async translate({ text, sourceLocale, targetLocale, format }: TranslateOptions): Promise<string[]> {
        const prompt = `Translate the following text from ${sourceLocale} to ${targetLocale}: \n${JSON.stringify(text, null, 2)}`
        // Mocked translate function with static response
        console.log('Translating text:', text)
        console.log('Prompt: ', prompt)
        console.log('Format:', format)

        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Do not add any additional information like that you are trained on data up to certain date',
            },
            {
              role: 'system',
              content: 'The text to translate is provided json format array. Respond also in json array format.'
            },
            {
              role: 'system',
              content: 'If source text is not provided return empty response.',
            },
            {
              role: 'system',
              content: 'Respond only with translated text. Without any additional information.',
            },
            { role: 'user', content: prompt },
          ],
        })
        const translatedText = response.choices[0].message.content
        console.log("Translated text: ", translatedText)
        if (!translatedText) {
          throw Error("Translation text empty!")
        }
        return JSON.parse(translatedText)
      },
      async shorten({text, length}: {text: string, length: number}): Promise<string> {
          const prompt = `Shorten the following text to not more than ${length} characters. Can be less. Keep the language and meaning: \n${text}`
          console.log('Shortening text:', text)
          console.log('Prompt: ', prompt)
          const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Do not add any additional information like that you are trained on data up to certain date',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          })
          const shortenedText = response.choices[0].message.content
          console.log("Shortened text: ", shortenedText)
          if (!shortenedText) {
            throw Error("Shortened text empty!")
          }
          return shortenedText
      },

      async usage() {
        // Mocked usage function with static response
        console.log('Fetching usage data')
        return 1000 // Mocked usage data
      },
    }
  },
}

export default OpenAIProvider
// @ts-ignore
module.exports = OpenAIProvider
