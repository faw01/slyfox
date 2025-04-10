/**
 * Schema definitions for solution generation
 */

/**
 * Basic schema for solution generation
 */
export const solutionSchema = {
  name: "generate_solution",
  description: "Generate an optimized solution for the coding problem",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The complete solution code"
      },
      thoughts: {
        type: "array",
        items: { type: "string" },
        description: "Step-by-step explanation of the solution approach"
      },
      approach: {
        type: "string",
        enum: [
          "Sliding Window", 
          "Two Pointers", 
          "Fast & Slow Pointers", 
          "Merge Intervals", 
          "Cyclic Sort", 
          "In-place Reversal of LinkedList", 
          "Tree BFS", 
          "Tree DFS", 
          "Two Heaps", 
          "Subsets", 
          "Modified Binary Search", 
          "Top K Elements", 
          "K-way Merge", 
          "Topological Sort", 
          "0/1 Knapsack",
          "Dynamic Programming",
          "Greedy",
          "Backtracking",
          "Brute Force"
        ],
        description: "The algorithmic pattern used in this solution"
      },
      clarifying_qa: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" }
          },
          required: ["question", "answer"]
        },
        description: "Important clarifying questions to ask the interviewer and their potential answers"
      },
      time_complexity: {
        type: "string",
        description: "Time complexity analysis in Big O notation"
      },
      space_complexity: {
        type: "string",
        description: "Space complexity analysis in Big O notation"
      },
      leetcode_match: {
        type: "object",
        properties: {
          problem_number: { type: "string" },
          title: { type: "string" },
          difficulty: { type: "string" },
          pattern: { type: "string" },
          match_explanation: { type: "string" }
        },
        required: ["problem_number", "title", "difficulty", "pattern"]
      }
    },
    required: ["code", "thoughts", "approach", "time_complexity", "space_complexity", "clarifying_qa"]
  }
};

/**
 * Detailed schema for solution generation with strict validation
 */
export const detailedSolutionSchema = {
  type: "object",
  properties: {
    code: { 
      type: "string",
      description: "The complete solution code"
    },
    thoughts: {
      type: "array",
      items: { type: "string" },
      description: "Step-by-step explanation of the solution approach"
    },
    approach: {
      type: "string",
      enum: [
        "Sliding Window", 
        "Two Pointers", 
        "Fast & Slow Pointers", 
        "Merge Intervals", 
        "Cyclic Sort", 
        "In-place Reversal of LinkedList", 
        "Tree BFS", 
        "Tree DFS", 
        "Two Heaps", 
        "Subsets", 
        "Modified Binary Search", 
        "Top K Elements", 
        "K-way Merge", 
        "Topological Sort", 
        "0/1 Knapsack",
        "Dynamic Programming",
        "Greedy",
        "Backtracking",
        "Brute Force"
      ],
      description: "The algorithmic pattern used in this solution"
    },
    clarifying_qa: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" }
        },
        required: ["question", "answer"]
      },
      description: "Important clarifying questions to ask the interviewer and their potential answers"
    },
    leetcode_match: {
      type: "object",
      properties: {
        problem_number: { type: "string" },
        title: { type: "string" },
        difficulty: { type: "string" },
        pattern: { type: "string" },
        match_explanation: { type: "string" }
      },
      required: ["problem_number", "title", "difficulty", "pattern"],
      additionalProperties: false
    },
    time_complexity: {
      type: "string",
      description: "Time complexity analysis in Big O notation"
    },
    space_complexity: {
      type: "string",
      description: "Space complexity analysis in Big O notation"
    }
  },
  required: [
    "code",
    "thoughts",
    "approach",
    "time_complexity",
    "space_complexity",
    "clarifying_qa"
  ],
  additionalProperties: false
}; 