# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Streamline.ai" [level=1] [ref=e6]
      - paragraph [ref=e7]: Create your account
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Full Name
        - generic [ref=e11]:
          - img [ref=e12]
          - textbox "Full Name" [ref=e15]:
            - /placeholder: John Doe
      - generic [ref=e16]:
        - generic [ref=e17]: Email
        - generic [ref=e18]:
          - img [ref=e19]
          - textbox "Email" [ref=e22]:
            - /placeholder: you@example.com
      - generic [ref=e23]:
        - generic [ref=e24]: Password
        - generic [ref=e25]:
          - img [ref=e26]
          - textbox "Password" [ref=e29]:
            - /placeholder: At least 6 characters
      - generic [ref=e30]:
        - generic [ref=e31]: Confirm Password
        - generic [ref=e32]:
          - img [ref=e33]
          - textbox "Confirm Password" [ref=e36]:
            - /placeholder: Confirm your password
      - button "Sign Up" [ref=e37] [cursor=pointer]
    - paragraph [ref=e39]:
      - text: Already have an account?
      - button "Sign in" [ref=e40] [cursor=pointer]
  - alert [ref=e41]
```