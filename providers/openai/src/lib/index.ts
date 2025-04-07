'use strict'

import OpenAI from 'openai'
import Mustache from 'mustache'

interface ProviderOptions {
  apiKey?: string
  localeMap?: Record<string, string>
  apiOptions?: Record<string, any>
  shortenPrompt?: string
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

    const makeOpenAiRequest = async (messages: any[]) => {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
      })
      const content = response.choices[0].message.content
      console.log('OpenAI response:', content)
      if (!content) {
        throw Error('OpenAI response empty!')
      }
      return JSON.parse(content)
    }

    return {
      async translate({ text, sourceLocale, targetLocale, format }: TranslateOptions): Promise<string[] | undefined> {
        const prompt = `Translate the following text from ${sourceLocale} to ${targetLocale}: \n${JSON.stringify(text, null, 2)}`
        // Mocked translate function with static response
        console.log('Translating text:', text)
        console.log('Prompt: ', prompt)
        console.log('Format:', format)
        const messages = [
          {
            role: 'system',
            content: 'Do not add any additional information like that you are trained on data up to certain date',
          },
          {
            role: 'system',
            content: 'The text to translate is provided json format array. Respond in json array format.',
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
        ]

        let attempt = 1
        while (attempt < 5) {
          try {
            return await makeOpenAiRequest(messages)
          } catch (error) {
            console.error(error)
            attempt++
          }
        }
      },
      async shorten({ text, length }: { text: string, length: number }): Promise<string> {
        let attempt = 1
        let currentLength = length

        while (true) {
          let prompt = providerOptions.shortenPrompt ? Mustache.render(providerOptions.shortenPrompt, {
            text,
            length: currentLength,
          }) : `Shorten the following text to not more than ${currentLength} characters. Can be less. Keep the language and meaning: \n${text}`
          console.info('Shortening text:', text)
          console.info('Prompt: ', prompt)
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
          console.log('Shortened text: ', shortenedText)
          if (!shortenedText) {
            throw Error('Shortened text empty!')
          }
          if (shortenedText.length <= length) {
            return shortenedText
          }
          attempt++
          currentLength = Math.max(currentLength - 20, Math.floor(currentLength / 2))
          if (attempt > 8) {
            throw Error('Shortened text too long!')
          }
        }
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
