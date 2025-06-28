import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class OpenAIService {

  // TODO: Implement OpenAI API client
  async getResponse(prompt: string): Promise<string> {
    // TODO: Make API request to OpenAI
    return '';
  }

  // TODO: Implement API error handling
}
