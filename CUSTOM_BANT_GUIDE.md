# Custom BANT Configuration Guide

## Overview

The Custom BANT feature allows users to customize how leads are scored based on Budget, Authority, Need, Timeline, and Contact information. This enables businesses to tailor lead qualification to their specific needs and priorities.

## Features

### 1. Customizable Weights
- Adjust the importance of each BANT component (Budget, Authority, Need, Timeline, Contact)
- Weights must total exactly 100%
- Visual sliders for easy adjustment with real-time validation

### 2. Custom Criteria
Define specific scoring criteria for each component:

**Budget Criteria**
- Set budget ranges (min/max values)
- Assign points for each range
- Example: >$20M = 30 points, $15-20M = 25 points

**Authority Criteria**
- Define decision-maker types
- Assign points based on authority level
- Example: Sole Owner = 20 points, Business Partner = 15 points

**Need Criteria**
- Categorize different need types
- Score based on urgency or purpose
- Example: Primary Residence = 15 points, Investment = 12 points

**Timeline Criteria**
- Set timeframe categories
- Higher points for urgent timelines
- Example: Within 1 Month = 25 points, 3-6 Months = 15 points

**Contact Criteria**
- Score based on contact information completeness
- Example: Full Contact (Name + Phone + Email) = 10 points

### 3. Lead Classification Thresholds
- **Priority Lead**: ≥90 points (default)
- **Hot Lead**: ≥80 points (default)
- **Warm Lead**: ≥60 points (default)
- **Cold Lead**: <60 points

All thresholds are customizable with validation to ensure proper ordering.

### 4. Real-time Preview
- View the generated BANT scoring prompt
- See how your configuration will be interpreted by the AI
- Understand the scoring logic before saving

## How to Use

### Accessing BANT Configuration

1. Navigate to the **Agents** page
2. Click on your agent to open the management page
3. Find the **Custom BANT Configuration** section

### Configuring Weights

1. Click the **Weights** tab
2. Use the sliders to adjust each component's weight
3. Ensure the total equals 100% (shown in the badge)
4. The system prevents saving if weights don't total 100%

### Setting Up Criteria

1. Click the **Criteria** tab
2. For each component (Budget, Authority, Need, Timeline, Contact):
   - Click **Add** to create new criteria
   - Fill in the label and points
   - For Budget, also set min/max values
   - Click the trash icon to remove criteria

### Adjusting Thresholds

1. Click the **Thresholds** tab
2. Use sliders to set minimum scores for each lead type
3. Ensure thresholds are in descending order:
   - Priority > Hot > Warm
4. Cold leads are automatically anything below the Warm threshold

### Saving Configuration

1. Click **Save Configuration** at the bottom
2. The system will validate:
   - Weights total 100%
   - Thresholds are in correct order
   - All required fields are filled
3. A success message confirms the save

### Deleting Configuration

1. Click **Delete Configuration**
2. Confirm the deletion in the dialog
3. The agent will revert to default BANT scoring

## Integration with Chat System

Once configured, your custom BANT settings are automatically used:

1. When conversations happen, the AI uses your custom scoring
2. Leads are qualified based on your criteria
3. Lead types (Priority/Hot/Warm/Cold) reflect your thresholds
4. The scoring appears in the Leads section

## Best Practices

### Weight Distribution
- **High-value businesses**: Increase Budget weight (35-40%)
- **B2C focus**: Increase Timeline and Contact weights
- **Enterprise sales**: Increase Authority weight
- **Urgent services**: Increase Need and Timeline weights

### Criteria Design
- **Be specific**: Clear labels help the AI understand intent
- **Use realistic ranges**: Base on your actual customer data
- **Progressive scoring**: Higher points for better qualification
- **Cover all scenarios**: Ensure no gaps in ranges

### Threshold Setting
- **Industry standards**: 
  - Priority: Top 10% of leads
  - Hot: Next 20% of leads
  - Warm: Next 30% of leads
  - Cold: Bottom 40% of leads
- **Adjust based on capacity**: Higher thresholds if you have limited resources
- **Monitor and refine**: Adjust based on conversion rates

## Technical Details

### API Endpoints

- `GET /api/agents/:agentId/bant-config` - Retrieve configuration
- `POST /api/agents/:agentId/bant-config` - Create/update configuration
- `DELETE /api/agents/:agentId/bant-config` - Delete configuration

### Data Structure

```javascript
{
  budget_weight: 30,         // 0-100
  authority_weight: 20,      // 0-100
  need_weight: 15,          // 0-100
  timeline_weight: 25,      // 0-100
  contact_weight: 10,       // 0-100
  
  budget_criteria: [
    { min: 20000000, max: null, points: 30, label: ">$20M" }
  ],
  authority_criteria: [
    { type: "sole_owner", points: 20, label: "Sole Owner" }
  ],
  need_criteria: [
    { type: "residence", points: 15, label: "Primary Residence" }
  ],
  timeline_criteria: [
    { type: "within_1_month", points: 25, label: "Within 1 Month" }
  ],
  contact_criteria: [
    { type: "full_contact", points: 10, label: "Name + Phone + Email" }
  ],
  
  priority_threshold: 90,
  hot_threshold: 80,
  warm_threshold: 60
}
```

### Database Schema

The configuration is stored in the `custom_bant_configs` table with:
- Unique constraint per agent
- Weight validation (sum = 100)
- Threshold ordering validation
- JSONB storage for flexible criteria
- Automatic prompt generation

## Troubleshooting

### "Weights must total exactly 100%"
- Adjust sliders until the total badge shows 100%
- Use the displayed percentages as a guide

### "Thresholds must be in descending order"
- Ensure Priority > Hot > Warm
- Adjust sliders so each threshold is properly ordered

### Configuration not saving
- Check browser console for errors
- Ensure you're logged in with proper permissions
- Verify the backend server is running

### Custom scoring not applying
- Confirm configuration is saved (check Preview tab)
- Test with a new conversation
- Check the Leads section for updated scores

## Examples

### Real Estate Focus
- Budget: 35% (most important)
- Authority: 20% (decision maker matters)
- Need: 15% (type of property)
- Timeline: 20% (urgency)
- Contact: 10% (basic requirement)

### B2B Enterprise
- Budget: 25%
- Authority: 30% (C-level required)
- Need: 20% (business case)
- Timeline: 15%
- Contact: 10%

### Quick Sales
- Budget: 20%
- Authority: 15%
- Need: 20%
- Timeline: 35% (urgency is key)
- Contact: 10%

## Future Enhancements

- Import/export configurations
- Configuration templates
- A/B testing different configurations
- Analytics on configuration performance
- Multi-language BANT criteria