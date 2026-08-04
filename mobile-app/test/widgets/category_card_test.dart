import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:remindly_mobile/widgets/category_card.dart';

void main() {
  testWidgets('CategoryCard renders and handles taps', (tester) async {
    var tapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CategoryCard(
            title: 'Server maintenance',
            icon: Icons.dns_outlined,
            color: Colors.teal,
            onTap: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.text('Server maintenance'), findsOneWidget);
    expect(find.byIcon(Icons.dns_outlined), findsOneWidget);

    await tester.tap(find.byType(CategoryCard));
    await tester.pump();
    expect(tapped, isTrue);
  });
}
