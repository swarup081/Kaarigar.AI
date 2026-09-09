import os
import re

emoji_pattern = re.compile(
    u"(\ud83d[\ude00-\ude4f])|"  # emoticons
    u"(\ud83c[\udf00-\uffff])|"  # symbols & pictographs
    u"(\ud83d[\u0000-\uddff])|"  # symbols & pictographs
    u"(\ud83d[\ude80-\udeff])|"  # transport & map symbols
    u"(\ud83c[\udde0-\uddff])|"  # flags
    u"([\u2600-\u27BF])|"        # misc symbols
    u"(\u2B50)|"                 # star
    u"(\u23F1)|"                 # stopwatch
    u"(\u23F2)|"                 # timer
    u"(\u23E9)|"                 # fast forward
    u"(\u23EA)|"                 # rewind
    u"(\u25B6)|"                 # play
    u"(\u23F9)|"                 # stop button
    u"(\u2192)|"                 # right arrow (not strictly emoji but often used like one)
    u"(\u2190)"                  # left arrow
    "+", flags=re.UNICODE)

def remove_emojis_from_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = emoji_pattern.sub('', content)
                # also remove some specific left-over ones like the ones that missed the regex
                # e.g. 🎉 💬 ➕ ✅ 📸 ☀️ 🌙 ⊙ ◎ ✋ 👋 ⏳ 🏷️ 📜 🇮🇳 🎤 ⏹️ ▶️ 🔄 → ←
                new_content = new_content.replace('🎉', '').replace('💬', '').replace('➕', '').replace('✅', '')
                new_content = new_content.replace('📸', '').replace('☀️', '').replace('🌙', '').replace('⊙', '').replace('◎', '')
                new_content = new_content.replace('✋', '').replace('👋', '').replace('⏳', '').replace('🏷️', '').replace('📜', '')
                new_content = new_content.replace('🇮🇳', '').replace('🎤', '').replace('⏹️', '').replace('▶️', '').replace('🔄', '')
                new_content = new_content.replace('→', '').replace('←', '')
                new_content = new_content.replace('📦', '').replace('🏠', '').replace('📢', '').replace('👤', '')
                
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Removed emojis from {filepath}")

remove_emojis_from_dir('/Users/swarup/kaarigar/Kaarigar.AI/apps/mobile/app')
