"""AI Agent service for executing tools and actions"""
import json
import re
import ast
import operator
import asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional, Callable
from datetime import datetime
import httpx

from ..core.config import settings
from .ollama_service import ollama_service


class Tool:
    """Base class for agent tools"""
    name: str
    description: str
    parameters: Dict[str, Any]

    async def execute(self, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError


class WebSearchTool(Tool):
    name = "web_search"
    description = "Search the web for current information"
    parameters = {
        "query": {"type": "string", "description": "The search query"}
    }

    async def execute(self, query: str) -> Dict[str, Any]:
        # Using DuckDuckGo HTML search (no API key needed)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params={"q": query},
                    headers={"User-Agent": "Mozilla/5.0"},
                    timeout=10.0
                )
                # Parse basic results from HTML
                results = []
                text = response.text
                # Extract result snippets
                snippets = re.findall(r'class="result__snippet"[^>]*>([^<]+)', text)
                titles = re.findall(r'class="result__title"[^>]*>.*?<a[^>]*>([^<]+)', text)

                for i, (title, snippet) in enumerate(zip(titles[:5], snippets[:5])):
                    results.append({
                        "title": title.strip(),
                        "snippet": snippet.strip()
                    })

                return {
                    "success": True,
                    "results": results,
                    "query": query
                }
        except Exception as e:
            return {"success": False, "error": str(e)}


class SafeMathEvaluator(ast.NodeVisitor):
    """Safe mathematical expression evaluator using AST"""

    OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }

    FUNCTIONS = {
        'abs': abs,
        'round': round,
        'min': min,
        'max': max,
        'pow': pow,
        'sqrt': lambda x: x ** 0.5,
    }

    def visit_BinOp(self, node):
        left = self.visit(node.left)
        right = self.visit(node.right)
        op = self.OPERATORS.get(type(node.op))
        if op is None:
            raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
        return op(left, right)

    def visit_UnaryOp(self, node):
        operand = self.visit(node.operand)
        op = self.OPERATORS.get(type(node.op))
        if op is None:
            raise ValueError(f"Unsupported unary operator: {type(node.op).__name__}")
        return op(operand)

    def visit_Num(self, node):  # Python 3.7 compatibility
        return node.n

    def visit_Constant(self, node):  # Python 3.8+
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant type: {type(node.value)}")

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if func_name in self.FUNCTIONS:
                args = [self.visit(arg) for arg in node.args]
                return self.FUNCTIONS[func_name](*args)
        raise ValueError(f"Unsupported function call")

    def visit_Expr(self, node):
        return self.visit(node.value)

    def generic_visit(self, node):
        raise ValueError(f"Unsupported expression type: {type(node).__name__}")


def safe_math_eval(expression: str) -> float:
    """Safely evaluate a mathematical expression"""
    try:
        tree = ast.parse(expression, mode='eval')
        evaluator = SafeMathEvaluator()
        return evaluator.visit(tree.body)
    except Exception as e:
        raise ValueError(f"Invalid expression: {e}")


class CalculatorTool(Tool):
    name = "calculator"
    description = "Perform mathematical calculations"
    parameters = {
        "expression": {"type": "string", "description": "Mathematical expression to evaluate"}
    }

    async def execute(self, expression: str) -> Dict[str, Any]:
        try:
            result = safe_math_eval(expression)
            return {"success": True, "result": result, "expression": expression}
        except Exception as e:
            return {"success": False, "error": str(e)}


class DateTimeTool(Tool):
    name = "datetime"
    description = "Get current date and time information"
    parameters = {
        "format": {"type": "string", "description": "Optional format string", "required": False}
    }

    async def execute(self, format: str = None) -> Dict[str, Any]:
        now = datetime.now()
        return {
            "success": True,
            "datetime": now.isoformat(),
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%H:%M:%S"),
            "day": now.strftime("%A"),
            "formatted": now.strftime(format) if format else now.strftime("%B %d, %Y at %I:%M %p")
        }


class FileReadTool(Tool):
    name = "read_file"
    description = "Read contents of a local file"
    parameters = {
        "file_path": {"type": "string", "description": "Path to the file to read"}
    }

    async def execute(self, file_path: str) -> Dict[str, Any]:
        try:
            # Security: only allow reading from specific directories
            from pathlib import Path
            path = Path(file_path).resolve()

            # Check if within allowed directories
            allowed_dirs = [
                Path.home() / "Documents",
                Path.home() / "Desktop",
                settings.DATA_DIR
            ]

            if not any(str(path).startswith(str(d)) for d in allowed_dirs):
                return {"success": False, "error": "Access denied: file outside allowed directories"}

            if not path.exists():
                return {"success": False, "error": "File not found"}

            content = path.read_text()
            return {
                "success": True,
                "content": content[:10000],  # Limit content size
                "path": str(path),
                "size": len(content),
                "truncated": len(content) > 10000
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


class AgentService:
    """Service for AI agent with tool use capabilities"""

    def __init__(self):
        self.tools: Dict[str, Tool] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        """Register built-in tools"""
        for tool_class in [WebSearchTool, CalculatorTool, DateTimeTool, FileReadTool]:
            tool = tool_class()
            self.tools[tool.name] = tool

    def register_tool(self, tool: Tool):
        """Register a custom tool"""
        self.tools[tool.name] = tool

    def get_tools_description(self) -> str:
        """Get formatted description of all available tools"""
        descriptions = []
        for name, tool in self.tools.items():
            params = ", ".join([f"{k}: {v['type']}" for k, v in tool.parameters.items()])
            descriptions.append(f"- {name}({params}): {tool.description}")
        return "\n".join(descriptions)

    def _build_agent_prompt(self, user_message: str, context: str = "") -> str:
        """Build the agent system prompt"""
        tools_desc = self.get_tools_description()

        return f"""You are an AI assistant with access to the following tools:

{tools_desc}

To use a tool, respond with a JSON block in this format:
```json
{{"tool": "tool_name", "parameters": {{"param1": "value1"}}}}
```

After receiving tool results, provide your final response to the user.
If you don't need any tools, respond directly to the user.

{context}

Remember:
- Only use tools when necessary
- You can use multiple tools in sequence
- Always explain what you're doing
- Provide helpful, accurate responses"""

    async def execute_tool(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool by name"""
        if tool_name not in self.tools:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

        tool = self.tools[tool_name]
        return await tool.execute(**parameters)

    def _extract_tool_calls(self, text: str) -> List[Dict[str, Any]]:
        """Extract tool calls from model response"""
        tool_calls = []

        # Look for JSON blocks
        json_pattern = r'```json\s*(\{[^`]+\})\s*```'
        matches = re.findall(json_pattern, text, re.DOTALL)

        for match in matches:
            try:
                data = json.loads(match)
                if "tool" in data:
                    tool_calls.append(data)
            except json.JSONDecodeError:
                continue

        # Also check for inline JSON
        inline_pattern = r'\{"tool":\s*"[^"]+",\s*"parameters":\s*\{[^}]+\}\}'
        inline_matches = re.findall(inline_pattern, text)

        for match in inline_matches:
            try:
                data = json.loads(match)
                if "tool" in data:
                    tool_calls.append(data)
            except json.JSONDecodeError:
                continue

        return tool_calls

    async def run_agent(
        self,
        message: str,
        model: str = None,
        context: str = "",
        max_iterations: int = 5
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Run the agent with tool use"""
        model = model or settings.MODELS['fast']
        system_prompt = self._build_agent_prompt(message, context)

        messages = [{"role": "user", "content": message}]
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # Get model response
            full_response = ""
            async for chunk in ollama_service.chat_stream(
                model=model,
                messages=messages,
                system=system_prompt,
                options={"temperature": 0.7}
            ):
                if "message" in chunk and "content" in chunk["message"]:
                    content = chunk["message"]["content"]
                    full_response += content
                    yield {
                        "type": "content",
                        "content": content,
                        "iteration": iteration
                    }

            # Check for tool calls
            tool_calls = self._extract_tool_calls(full_response)

            if not tool_calls:
                # No more tool calls, we're done
                yield {"type": "done", "final_response": full_response}
                return

            # Execute tools
            messages.append({"role": "assistant", "content": full_response})

            for tool_call in tool_calls:
                tool_name = tool_call.get("tool")
                parameters = tool_call.get("parameters", {})

                yield {
                    "type": "tool_call",
                    "tool": tool_name,
                    "parameters": parameters
                }

                result = await self.execute_tool(tool_name, parameters)

                yield {
                    "type": "tool_result",
                    "tool": tool_name,
                    "result": result
                }

                # Add tool result to messages
                messages.append({
                    "role": "user",
                    "content": f"Tool '{tool_name}' returned: {json.dumps(result)}"
                })

        yield {"type": "max_iterations", "message": "Reached maximum iterations"}


# Singleton instance
agent_service = AgentService()
