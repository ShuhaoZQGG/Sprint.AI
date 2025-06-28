import { Injectable } from '@nestjs/common';

import axios from 'axios';


@Injectable()

export class OpenAiService {

  async getCompletion(prompt: string): Promise<string> {

    // TODO: Implement OpenAI API call

    return '';

  }



  async getError(message: string): Promise<string> {

    // TODO: Implement error handling

    return '';

  }

}


// TODO: Add tests for OpenAiService