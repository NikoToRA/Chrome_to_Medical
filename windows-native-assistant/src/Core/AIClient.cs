using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using WindowsNativeAssistant.Config;
using WindowsNativeAssistant.Models;

namespace WindowsNativeAssistant.Core
{
    /// <summary>
    /// AI API client for generation requests
    /// </summary>
    public class AIClient
    {
        private readonly AppConfig _config;
        private readonly HttpClient _httpClient;

        public AIClient(AppConfig config)
        {
            _config = config;
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(config.Api.TimeoutSeconds)
            };
        }

        /// <summary>
        /// Generate AI content based on template and user input
        /// </summary>
        public async Task<GenerateResponse> GenerateAsync(string templateId, string userInput, Template template)
        {
            try
            {
                // Build prompt from template
                string prompt = template.PromptTemplate.Replace("{userInput}", userInput);

                // Create request payload for Azure Function API
                var requestPayload = new
                {
                    messages = new[]
                    {
                        new
                        {
                            role = "user",
                            content = prompt
                        }
                    },
                    system = "あなたは医療記録作成を支援するAIアシスタントです。正確で簡潔な記録を作成してください。"
                };

                var jsonContent = JsonSerializer.Serialize(requestPayload);
                var httpContent = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                // Add authorization header if token is configured
                if (!string.IsNullOrEmpty(_config.Api.Token))
                {
                    _httpClient.DefaultRequestHeaders.Clear();
                    _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_config.Api.Token}");
                }

                // Send request
                var response = await _httpClient.PostAsync(_config.Api.Endpoint, httpContent);

                if (!response.IsSuccessStatusCode)
                {
                    return new GenerateResponse
                    {
                        Success = false,
                        Error = $"API returned status code: {response.StatusCode}"
                    };
                }

                // Parse response
                var responseJson = await response.Content.ReadAsStringAsync();
                var apiResponse = JsonSerializer.Deserialize<ApiResponse>(responseJson);

                if (apiResponse == null)
                {
                    return new GenerateResponse
                    {
                        Success = false,
                        Error = "Failed to parse API response"
                    };
                }

                // Extract content from response
                string? result = null;
                if (apiResponse.choices != null && apiResponse.choices.Length > 0)
                {
                    result = apiResponse.choices[0].message?.content;
                }

                if (string.IsNullOrEmpty(result))
                {
                    return new GenerateResponse
                    {
                        Success = false,
                        Error = "No content in API response"
                    };
                }

                return new GenerateResponse
                {
                    Success = true,
                    Result = result
                };
            }
            catch (TaskCanceledException)
            {
                return new GenerateResponse
                {
                    Success = false,
                    Error = "Request timed out"
                };
            }
            catch (HttpRequestException ex)
            {
                return new GenerateResponse
                {
                    Success = false,
                    Error = $"Network error: {ex.Message}"
                };
            }
            catch (Exception ex)
            {
                return new GenerateResponse
                {
                    Success = false,
                    Error = $"Unexpected error: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// API response model (matches Azure Function response format)
        /// </summary>
        private class ApiResponse
        {
            public Choice[]? choices { get; set; }
        }

        private class Choice
        {
            public Message? message { get; set; }
        }

        private class Message
        {
            public string? content { get; set; }
        }
    }
}
