"""Optional Google ADK-style A2A sample for agentkitche.dev.

This file is intentionally not imported by Kitchen startup. It is a tiny local
fixture operators can adapt when proving that a Google ADK A2A agent can be
registered in Kitchen and receive delegated tasks over HTTP.
"""

try:
    from google.adk.agents import Agent
except ImportError as exc:  # pragma: no cover - this sample is optional.
    raise SystemExit(
        "Install the optional ADK runtime first: pip install 'google-adk[a2a]'"
    ) from exc


def check_prime(number: int) -> dict[str, object]:
    """Return whether number is prime with a short explanation."""
    if number < 2:
        return {"number": number, "is_prime": False, "reason": "Prime numbers are greater than 1."}
    for divisor in range(2, int(number**0.5) + 1):
        if number % divisor == 0:
            return {
                "number": number,
                "is_prime": False,
                "reason": f"{number} is divisible by {divisor}.",
            }
    return {"number": number, "is_prime": True, "reason": f"{number} has no divisors other than 1 and itself."}


root_agent = Agent(
    name="check_prime_agent",
    model="gemini-2.5-flash",
    description="Checks whether integers are prime.",
    instruction=(
        "You are a concise math helper. Use check_prime when asked whether a "
        "number is prime, then explain the result plainly."
    ),
    tools=[check_prime],
)
