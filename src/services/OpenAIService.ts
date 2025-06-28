import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class OpenAIService {

  private openAiApiUrl = 'https://api.openai.com';

  constructor(private http: HttpClient) {}

  // TODO: Implement OpenAI API call
  async getResponse(prompt: string) {
    // TODO: Send request to OpenAI API
    return;
  }

  // TODO: Implement error handling
  handleErrorResponse(error: any) {
    // TODO: Handle error
  }
}
