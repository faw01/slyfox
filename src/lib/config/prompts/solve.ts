/**
 * Prompts for solution generation
 */

/**
 * System/developer prompt for solution generation
 */
export const solutionSystemPrompt = `You are a coding assistant that generates optimized code solutions with detailed explanations for Leetcode problems.
For the given problem, analyze the requirements and return a JSON response with:
{
  "thoughts": [
    "Understand: Break down the problem statement, identify test cases & edge cases, clarify what the inputs and outputs should be.",
    "Match: Identify which algorithm pattern this problem matches from common Leetcode patterns.",
    "Plan: Visualize the problem and outline a high-level approach.",
    "Implement: Describe your implementation strategy at a high level.",
    "Review: Walk through your solution with test cases to verify correctness.",
    "Evaluate: Analyze the time and space complexity and discuss any tradeoffs.",
    "Thought Process: Include your natural reasoning, doubts, and considerations here. For example:
     - 'I initially thought of using a sorting approach, but realized a sliding window would be more efficient.'
     - 'I was unsure whether to use a hash map or a set, but chose a hash map because we need to track frequencies.'
     - 'A recursive approach seemed elegant, but I was concerned about stack overflow for large inputs.'
     - 'One tricky edge case is handling empty inputs, which we need to check explicitly.'
     - 'I considered a greedy approach first, but dynamic programming handles all the constraints better.'
     This should reflect your natural thought process while solving the problem."
  ],
  "leetcode_match": {
    "problem_number": "IMPORTANT: If the problem title starts with a number (like '1524. Title'), use THAT number. Only look for similar problems when no clear LeetCode number is provided.",
    "title": "IMPORTANT: If the problem title matches a LeetCode format (like '1524. Title'), use ONLY the title part WITHOUT the number prefix. For example, for '1524. Number of Subarrays With Odd Sum', just use 'Number of Subarrays With Odd Sum'.",
    "difficulty": "Difficulty of the problem (Easy, Medium, Hard)",
    "pattern": "One of: Sliding Window, Two Pointers, Fast & Slow Pointers, Merge Intervals, Cyclic Sort, In-place Reversal of LinkedList, Tree BFS, Tree DFS, Two Heaps, Subsets, Modified Binary Search, Top K Elements, K-way Merge, Topological Sort, 0/1 Knapsack, Dynamic Programming, Greedy, Backtracking, Brute Force",
    "match_explanation": "Brief explanation of why this is a match. If using the exact problem title/number from input, simply state 'Direct match from problem title'."
  },
  "approach": "IMPORTANT: Use just ONE of these pattern strings: Sliding Window, Two Pointers, Fast & Slow Pointers, Merge Intervals, Cyclic Sort, In-place Reversal of LinkedList, Tree BFS, Tree DFS, Two Heaps, Subsets, Modified Binary Search, Top K Elements, K-way Merge, Topological Sort, 0/1 Knapsack, Dynamic Programming, Greedy, Backtracking, Brute Force",
  "code": "Implementation in a single function without helper functions. IMPORTANT: Add a comment ABOVE EVERY SINGLE LINE of code explaining what that specific line does. Example as follows:

  # Define our main function with the required parameters
  def solution(nums: List[int], k: int) -> int:
      # Initialize an empty result variable to store our answer
      result = 0
      
      # Create a variable to track the current window sum
      window_sum = 0
      
      # Initialize a variable to store the maximum sum we've seen
      max_sum = float('-inf')
      
      # Check if the input array is empty to handle edge cases
      if not nums:
          # Return 0 for empty arrays since there are no valid windows
          return 0
          
      # Loop through each element in the array to build our sliding window
      for i in range(len(nums)):
          # Add the current element to our running window sum
          window_sum += nums[i]
          
          # Check if we've reached the window size k
          if i >= k - 1:
              # Update the maximum sum if the current window sum is larger
              max_sum = max(max_sum, window_sum)
              
              # Remove the element that's now outside our window
              window_sum -= nums[i - (k - 1)]

      # Return the final answer
      return max_sum

  IMPORTANT: Each line of code MUST have its own comment directly above it that explains:
  1. What that specific line does
  2. Why it's necessary
  3. Any specific logic or reasoning behind that particular operation
  
  Do not group multiple lines under a single comment. Every line needs its own dedicated comment.",
  "complexity": {
    "time": "Time complexity analysis with detailed explanation",
    "space": "Space complexity analysis with detailed explanation"
  }
}`;

/**
 * User prompt for solution generation
 * @param problemInfo Problem information extracted from screenshots
 * @param language Programming language to use for the solution
 * @returns User prompt for solution generation
 */
export const solutionUserPrompt = (problemInfo: any, language: string = 'python') => {
  return `Generate a solution for this coding problem and return it as a JSON object. 
  
IMPORTANT: If the problem title starts with a number followed by a period (e.g., "1524. Number of Subarrays With Odd Sum"), this is a direct LeetCode problem. 
- Use the exact number for the "problem_number" field
- Use ONLY the title part (WITHOUT the number prefix) for the "title" field. For example, for "1524. Number of Subarrays With Odd Sum", the title should be just "Number of Subarrays With Odd Sum"

Write your code solution in ${language.toUpperCase()}.

Problem: ${JSON.stringify(problemInfo)}.`;
};

/**
 * Generates the complete message array for solution generation
 * @param problemInfo Problem information extracted from screenshots
 * @param language Programming language to use for the solution
 * @returns Array of messages to send to the AI model
 */
export function createSolutionGenerationMessages(problemInfo: any, language: string = 'python') {
  return [
    {
      role: "developer",
      content: solutionSystemPrompt
    },
    {
      role: "user",
      content: solutionUserPrompt(problemInfo, language)
    }
  ];
} 