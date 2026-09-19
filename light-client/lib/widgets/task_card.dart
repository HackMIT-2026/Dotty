import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'big_button.dart';

/// Figma TaskCard (node 12-23). Done shows mint with a check, waiting shows amber with a clock.
/// Subtitle text is 18 px so child screens stay at 18 px or larger.
class TaskCard extends StatefulWidget {
  const TaskCard({
    super.key,
    required this.done,
    required this.title,
    required this.subtitle,
    this.whyText,
    this.onComplete,
  });

  final bool done;
  final String title;
  final String subtitle;
  final String? whyText; // shown behind "Why am I doing this?"
  final VoidCallback? onComplete; // null when done

  @override
  State<TaskCard> createState() => _TaskCardState();
}

class _TaskCardState extends State<TaskCard> {
  bool _showWhy = false;

  @override
  Widget build(BuildContext context) {
    final statusColor = widget.done ? AppColors.mint : AppColors.sunnyAmber;
    final statusIcon = widget.done ? Icons.check : Icons.schedule;

    return Container(
      padding: const EdgeInsets.all(AppSpace.s20),
      decoration: BoxDecoration(
        color: AppColors.white,
        border: Border.all(color: AppColors.borderSoft, width: AppBorder.width),
        borderRadius: BorderRadius.circular(AppRadius.card),
        boxShadow: AppShadows.soft,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: AppSize.statusIcon,
                height: AppSize.statusIcon,
                decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                child: Icon(statusIcon, color: AppColors.ink, semanticLabel: widget.done ? 'Done' : 'Waiting'),
              ),
              const SizedBox(width: AppSpace.s16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.title, style: AppText.button),
                    Text(widget.subtitle, style: AppText.bodyMuted),
                  ],
                ),
              ),
            ],
          ),
          if (widget.whyText != null)
            AnimatedSize(
              duration: AppMotion.of(context),
              alignment: Alignment.topCenter,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      minimumSize: const Size.fromHeight(AppSize.minTapTarget),
                      alignment: Alignment.centerLeft,
                      foregroundColor: AppColors.ink,
                    ),
                    onPressed: () => setState(() => _showWhy = !_showWhy),
                    icon: Icon(_showWhy ? Icons.expand_less : Icons.help_outline),
                    label: Text('Why am I doing this?', style: AppText.button),
                  ),
                  if (_showWhy)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.s8),
                      child: Text(widget.whyText!, style: AppText.body),
                    ),
                ],
              ),
            ),
          if (!widget.done && widget.onComplete != null) ...[
            const SizedBox(height: AppSpace.s8),
            BigButton(label: 'I did it!', icon: Icons.check, onPressed: widget.onComplete),
          ],
        ],
      ),
    );
  }
}
